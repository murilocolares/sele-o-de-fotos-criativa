import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 image transfers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini client on the server side (Telemetry User-Agent required)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper: Extract folder ID from Google Drive URL
function extractFolderId(input: string): string {
  const url = input.trim();
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (folderMatch && folderMatch[1]) {
      return folderMatch[1];
    }
    const idMatch = url.match(/id=([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
  }
  return url; // Assume raw ID if no matches
}

// Helper to pause execution with exponential backoff
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateContentWithRetry(aiClient: any, options: any, maxRetries = 5) {
  let attempt = 0;
  while (true) {
    try {
      return await aiClient.models.generateContent(options);
    } catch (error: any) {
      attempt++;
      
      const errMsg = error.message || "";
      const errStatus = error.status || error.statusCode || 0;
      
      const isRetriable = 
        errStatus === 503 || 
        errStatus === 429 ||
        errStatus === 500 ||
        errMsg.includes("503") ||
        errMsg.includes("429") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand") ||
        errMsg.includes("temporary") ||
        errMsg.includes("ResourceExhausted") ||
        errMsg.includes("overloaded") ||
        errMsg.includes("busy");

      if (isRetriable && attempt <= maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s + jitter
        const sleepTime = Math.pow(2, attempt - 1) * 1000 + Math.random() * 800;
        console.warn(`[Gemini API] Busy or experiencing high demand. Retrying (attempt ${attempt}/${maxRetries}). Waiting ${sleepTime.toFixed(0)}ms...`);
        await delay(sleepTime);
        continue;
      }
      throw error;
    }
  }
}

// API: Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
});

// API: Get Google Drive Folder Info
app.post("/api/drive/folder-info", async (req, res) => {
  const { folderUrlOrId, accessToken } = req.body;

  if (!folderUrlOrId) {
    return res.status(200).json({ success: false, error: "O link ou ID da pasta é obrigatório." });
  }
  if (!accessToken) {
    return res.status(200).json({ success: false, error: "Token de acesso do Google Drive ausente ou expirado." });
  }

  const folderId = extractFolderId(folderUrlOrId);
  if (!folderId) {
    return res.status(200).json({ success: false, error: "Não foi possível extrair um ID de pasta válido." });
  }

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,webViewLink,capabilities(canAddChildren)`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Drive Folder Info Error:", errText);
      let driveErrorMessage = "";
      try {
        const parsed = JSON.parse(errText);
        driveErrorMessage = parsed.error?.message || parsed.error || errText;
      } catch {
        driveErrorMessage = errText;
      }
      return res.status(200).json({ success: false, error: `Erro no Google Drive: ${driveErrorMessage}` });
    }

    const folderData = await response.json();
    res.json({
      success: true,
      folder: {
        id: folderData.id,
        name: folderData.name,
        webViewLink: folderData.webViewLink,
        canAddChildren: folderData.capabilities?.canAddChildren,
      }
    });
  } catch (error: any) {
    console.error("Folder info exception:", error);
    res.status(200).json({ success: false, error: "Erro interno ao buscar informações da pasta.", details: error.message });
  }
});

// API: List Images from Google Drive folder
app.post("/api/drive/list-images", async (req, res) => {
  const { folderId, accessToken } = req.body;

  if (!folderId) {
    return res.status(200).json({ success: false, error: "O ID da pasta é obrigatório." });
  }
  if (!accessToken) {
    return res.status(200).json({ success: false, error: "Token de acesso ausente." });
  }

  try {
    // List images that are not trashed inside the parent folder
    const q = `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`;
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&pageSize=100`;

    const response = await fetch(driveUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      let driveErrorMessage = "";
      try {
        const parsed = JSON.parse(errText);
        driveErrorMessage = parsed.error?.message || parsed.error || errText;
      } catch {
        driveErrorMessage = errText;
      }
      return res.status(200).json({ success: false, error: `Erro ao listar arquivos: ${driveErrorMessage}` });
    }

    const data = await response.json();
    res.json({ success: true, files: data.files || [] });
  } catch (error: any) {
    console.error("List images exception:", error);
    res.status(200).json({ success: false, error: "Erro interno ao listar imagens.", details: error.message });
  }
});

// API: Perform Face Recognition and Optionally Organize Google Drive photos
app.post("/api/drive/organize", async (req, res) => {
  const { folderId, accessToken, profiles, limit = 15, autoOrganizeInDrive = false } = req.body;

  if (!folderId) {
    return res.status(200).json({ success: false, error: "O ID da pasta é obrigatório." });
  }
  if (!accessToken) {
    return res.status(200).json({ success: false, error: "Token de acesso do Google Drive expirado ou ausente. Faça login novamente." });
  }
  if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
    return res.status(200).json({ success: false, error: "Crie pelo menos um perfil de referência antes de organizar." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({ success: false, error: "API Key do Gemini não configurada no servidor. Configure nos Secrets do painel lateral." });
  }

  const limitVal = limit === "all" ? 1000 : (Number(limit) || 15);

  try {
    // 1. List all non-trashed images in the target folder
    const q = `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`;
    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&pageSize=${limitVal}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listResponse.ok) {
      const errText = await listResponse.text();
      let driveErrorMessage = "";
      try {
        const parsed = JSON.parse(errText);
        driveErrorMessage = parsed.error?.message || parsed.error || errText;
      } catch {
        driveErrorMessage = errText;
      }
      return res.status(200).json({ success: false, error: `Erro ao listar imagens para organização: ${driveErrorMessage}` });
    }

    const listData = await listResponse.json();
    const files = listData.files || [];

    if (files.length === 0) {
      return res.json({
        success: true,
        message: "Nenhuma imagem encontrada na pasta especificada para analisar.",
        results: [],
      });
    }

    // Cache to hold or find subfolder IDs to avoid creating duplicate folders
    const subfolderCache: Record<string, string> = {};

    const results = [];

    // 2. Loop through each image and analyze
    for (const file of files) {
      try {
        // Fetch target image binary media
        const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!downloadResponse.ok) {
          throw new Error(`Falha ao baixar imagem: ${downloadResponse.statusText}`);
        }

        const buffer = await downloadResponse.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        // Format parts array for Gemini content api
        const parts: any[] = [
          {
            inlineData: {
              mimeType: file.mimeType || "image/jpeg",
              data: base64Image,
            },
          },
          { text: "Target Image: This is the photo to be classified." },
        ];

        // Append references to parts
        profiles.forEach((profile: any, idx: number) => {
          // Clean base64 string from data URI prefix if exists
          let cleanBase64 = profile.photoBase64;
          if (cleanBase64.includes("base64,")) {
            cleanBase64 = cleanBase64.split("base64,")[1];
          }

          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          });
          parts.push({
            text: `Reference Photo for person '${profile.name}' (ID: '${profile.id}')`,
          });
        });

        // Add matching prompt instructions
        parts.push({
          text: `You are an accurate face comparison assistant. Compare the 'Target Image' with each of the 'Reference Photos' provided.
Identify if any of the people from the 'Reference Photos' are clearly present in the 'Target Image'.
You must pay close attention to facial features (eyes, nose, mouth, shape, structure) and ignore backgrounds, clothing, lighting, and expressions.
Be conservative: only match if you are highly confident (confidence score >= 0.70).

Return your response strictly in JSON format according to this exact schema:
{
  "match": {
    "profileId": "ID of the matched reference profile, or null if no match",
    "profileName": "Name of the matched person, or null if no match",
    "confidence": 0.95 // Number between 0.0 and 1.0 indicating your confidence
  }
}`,
        });

        // Run Gemini 3.5 Flash Model with automatic retry for 503/429
        const geminiRes = await generateContentWithRetry(ai, {
          model: "gemini-3.5-flash",
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                match: {
                  type: Type.OBJECT,
                  properties: {
                    profileId: { type: Type.STRING, description: "ID of the matched reference profile, or null" },
                    profileName: { type: Type.STRING, description: "Name of the matched person, or null" },
                    confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
                  },
                  required: ["profileId", "profileName", "confidence"],
                },
              },
              required: ["match"],
            },
          },
        });

        const geminiText = geminiRes.text;
        if (!geminiText) {
          throw new Error("Resposta do Gemini vazia");
        }

        const parseResult = JSON.parse(geminiText.trim());
        const matchInfo = parseResult.match;

        let finalResult: any = {
          fileId: file.id,
          fileName: file.name,
          matchedProfileId: null,
          matchedProfileName: null,
          confidence: 0,
          status: "unmatched",
        };

        if (matchInfo && matchInfo.profileId && matchInfo.confidence >= 0.7) {
          finalResult.matchedProfileId = matchInfo.profileId;
          finalResult.matchedProfileName = matchInfo.profileName;
          finalResult.confidence = matchInfo.confidence;
          finalResult.status = "matched";

          // 3. Automatically organize the file on Google Drive if enabled
          if (autoOrganizeInDrive) {
            const folderName = `Álbum - ${matchInfo.profileName}`;
            let subfolderId = subfolderCache[folderName];

            // If not cached, search or create folder in Google Drive
            if (!subfolderId) {
              const searchQ = `'${folderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
              const searchRes = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQ)}&fields=files(id)`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );

              if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.files && searchData.files.length > 0) {
                  subfolderId = searchData.files[0].id;
                }
              }

              // Create subfolder if it does not exist
              if (!subfolderId) {
                const createRes = await fetch(`https://www.googleapis.com/drive/v3/files`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    name: folderName,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [folderId],
                  }),
                });

                if (createRes.ok) {
                  const createData = await createRes.json();
                  subfolderId = createData.id;
                } else {
                  console.error("Failed to create subfolder", await createRes.text());
                }
              }

              if (subfolderId) {
                subfolderCache[folderName] = subfolderId;
              }
            }

            // Move the file to the subfolder
            if (subfolderId) {
              const moveRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}?addParents=${subfolderId}&removeParents=${folderId}`,
                {
                  method: "PATCH",
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );

              if (moveRes.ok) {
                finalResult.subfolderId = subfolderId;
              } else {
                console.error(`Falha ao mover arquivo ${file.name} para o álbum`, await moveRes.text());
              }
            }
          }
        }

        results.push(finalResult);
      } catch (fileError: any) {
        console.error(`Error analyzing file ${file.name}:`, fileError);
        results.push({
          fileId: file.id,
          fileName: file.name,
          matchedProfileId: null,
          matchedProfileName: null,
          confidence: 0,
          status: "error",
          error: fileError.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Organização finalizada com sucesso.",
      results,
    });
  } catch (error: any) {
    console.error("Organize exception:", error);
    res.status(200).json({ success: false, error: "Ocorreu um erro ao processar a organização facial.", details: error.message });
  }
});

// Serve frontend assets in production and Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
