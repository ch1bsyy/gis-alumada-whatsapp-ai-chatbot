require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Chatbot GIS (Web Portal) & Basic App - Alumada Artha Prima",
      version: "1.0.0",
      description:
        "REST API Panduan SOP & FAQ Guard Information System (GIS) sekaligus Basic App untuk n8n AI Agent",
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-Api-Key",
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  },
  apis: ["./server.js"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const verifyApiKey = (req, res, next) => {
  const apiKey = req.header("X-Api-Key");
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: X-Api-Key tidak valid" });
  }
  next();
};

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /api/gis/search:
 *   get:
 *     summary: Cari Panduan SOP & FAQ GIS (Digunakan oleh n8n AI Agent Tool)
 *     tags: [GIS Knowledge]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Kata kunci pertanyaan/panduan
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter role opsional (Personil, Danru, Koordinator, Klien, Admin)
 *     responses:
 *       200:
 *         description: Daftar panduan lengkap yang relevan (maksimal 2 blok)
 */
app.get("/api/gis/search", verifyApiKey, async (req, res) => {
  const q = (req.query.q || "").trim();
  const role = (req.query.role || "").trim() || null;

  if (!q) return res.json({ found: false, data: [] });

  const { data, error } = await supabase.rpc("search_gis_knowledge", {
    kata_kunci: q,
    filter_role: role,
  });

  if (error)
    return res.status(500).json({ found: false, error: error.message });

  res.json({
    found: data && data.length > 0,
    data: data || [],
  });
});

/**
 * @swagger
 * /api/gis:
 *   get:
 *     summary: Ambil seluruh daftar Panduan & FAQ GIS
 *     tags: [GIS Knowledge]
 *     responses:
 *       200:
 *         description: Daftar semua dokumen panduan dan FAQ GIS
 */
app.get("/api/gis", verifyApiKey, async (req, res) => {
  const { data, error } = await supabase
    .from("gis_knowledge")
    .select("*")
    .order("id", { ascending: true });

  if (error)
    return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data });
});

/**
 * @swagger
 * /api/gis:
 *   post:
 *     summary: Tambah Panduan SOP atau FAQ GIS baru
 *     tags: [GIS Knowledge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, keywords]
 *             properties:
 *               role:
 *                 type: string
 *               doc_type:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               keywords:
 *                 type: string
 *     responses:
 *       201:
 *         description: Data GIS berhasil ditambahkan
 */
app.post("/api/gis", verifyApiKey, async (req, res) => {
  const { role, doc_type, title, content, keywords } = req.body;
  if (!title || !content) {
    return res
      .status(400)
      .json({ success: false, message: "title dan content wajib diisi" });
  }

  const { data, error } = await supabase
    .from("gis_knowledge")
    .insert([
      {
        role: role || "Semua",
        doc_type: doc_type || "SOP",
        title,
        content,
        keywords: keywords || "",
      },
    ])
    .select();

  if (error)
    return res.status(500).json({ success: false, error: error.message });
  res.status(201).json({ success: true, data: data[0] });
});

/**
 * @swagger
 * /api/gis/{id}:
 *   put:
 *     summary: Ubah data Panduan/FAQ GIS berdasarkan ID
 *     tags: [GIS Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               doc_type:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               keywords:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Data GIS berhasil diperbarui
 */
app.put("/api/gis/:id", verifyApiKey, async (req, res) => {
  const { id } = req.params;
  const { role, doc_type, title, content, keywords, is_active } = req.body;

  const { data, error } = await supabase
    .from("gis_knowledge")
    .update({
      role,
      doc_type,
      title,
      content,
      keywords,
      is_active,
      updated_at: new Date(),
    })
    .eq("id", id)
    .select();

  if (error)
    return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data: data[0] });
});

/**
 * @swagger
 * /api/gis/{id}:
 *   delete:
 *     summary: Hapus data Panduan/FAQ GIS berdasarkan ID
 *     tags: [GIS Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Data GIS berhasil dihapus
 */
app.delete("/api/gis/:id", verifyApiKey, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("gis_knowledge").delete().eq("id", id);

  if (error)
    return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, message: "Data GIS berhasil dihapus" });
});

/**
 * @swagger
 * /api/basic-app/search:
 *   get:
 *     summary: Cari Panduan SOP & FAQ Basic App (Digunakan oleh n8n AI Agent Tool)
 *     tags: [Basic App Knowledge]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Kata kunci pertanyaan/panduan Basic App (misal lamar lowongan, k1 k6, import karyawan, nik gagal login)
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *         description: Opsional filter role (Pelamar, Personil, HRD)
 *     responses:
 *       200:
 *         description: Daftar panduan Basic App yang relevan (maksimal 2 blok)
 */
app.get("/api/basic-app/search", verifyApiKey, async (req, res) => {
  const q = (req.query.q || "").trim();
  const role = (req.query.role || "").trim() || null;

  if (!q) return res.json({ found: false, data: [] });

  const { data, error } = await supabase.rpc("search_basic_app_knowledge", {
    kata_kunci: q,
    filter_role: role,
  });

  if (error)
    return res.status(500).json({ found: false, error: error.message });

  res.json({
    found: data && data.length > 0,
    data: data || [],
  });
});

/**
 * @swagger
 * /api/basic-app:
 *   get:
 *     summary: Ambil seluruh daftar Panduan & FAQ Basic App (Untuk Dashboard Admin)
 *     tags: [Basic App Knowledge]
 *     responses:
 *       200:
 *         description: Daftar semua dokumen panduan dan FAQ Basic App
 */
app.get("/api/basic-app", verifyApiKey, async (req, res) => {
  const { data, error } = await supabase
    .from("basic_app_knowledge")
    .select("*")
    .order("id", { ascending: true });

  if (error)
    return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data });
});

/**
 * @swagger
 * /api/basic-app:
 *   post:
 *     summary: Tambah Panduan SOP atau FAQ Basic App baru
 *     tags: [Basic App Knowledge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, keywords]
 *             properties:
 *               role:
 *                 type: string
 *                 example: Pelamar
 *               doc_type:
 *                 type: string
 *                 example: SOP
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               keywords:
 *                 type: string
 *     responses:
 *       201:
 *         description: Data Basic App berhasil ditambahkan
 */
app.post("/api/basic-app", verifyApiKey, async (req, res) => {
  const { role, doc_type, title, content, keywords } = req.body;
  if (!title || !content) {
    return res
      .status(400)
      .json({ success: false, message: "title dan content wajib diisi" });
  }

  const { data, error } = await supabase
    .from("basic_app_knowledge")
    .insert([
      {
        role: role || "Semua",
        doc_type: doc_type || "SOP",
        title,
        content,
        keywords: keywords || "",
      },
    ])
    .select();

  if (error)
    return res.status(500).json({ success: false, error: error.message });
  res.status(201).json({ success: true, data: data[0] });
});

/**
 * @swagger
 * /api/basic-app/{id}:
 *   put:
 *     summary: Ubah data Panduan/FAQ Basic App berdasarkan ID
 *     tags: [Basic App Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               doc_type:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               keywords:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Data Basic App berhasil diperbarui
 */
app.put("/api/basic-app/:id", verifyApiKey, async (req, res) => {
  const { id } = req.params;
  const { role, doc_type, title, content, keywords, is_active } = req.body;

  const { data, error } = await supabase
    .from("basic_app_knowledge")
    .update({
      role,
      doc_type,
      title,
      content,
      keywords,
      is_active,
      updated_at: new Date(),
    })
    .eq("id", id)
    .select();

  if (error)
    return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data: data[0] });
});

/**
 * @swagger
 * /api/basic-app/{id}:
 *   delete:
 *     summary: Hapus data Panduan/FAQ Basic App berdasarkan ID
 *     tags: [Basic App Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Data Basic App berhasil dihapus
 */
app.delete("/api/basic-app/:id", verifyApiKey, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from("basic_app_knowledge")
    .delete()
    .eq("id", id);

  if (error)
    return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, message: "Data Basic App berhasil dihapus" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend GIS berjalan di port ${PORT}`);
});
