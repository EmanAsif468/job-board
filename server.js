const express = require("express");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { authenticate, requireRole } = require("./auth");

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3001" }));

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("Hello from my API!");
});

// ---------- Jobs ----------

app.get("/jobs", async (req, res) => {
  const { location, type } = req.query;

  const conditions = [];
  const values = [];

  if (location) {
    values.push(`%${location}%`);
    conditions.push(`location ILIKE $${values.length}`);
  }

  if (type) {
    values.push(type);
    conditions.push(`type = $${values.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT * FROM jobs ${where} ORDER BY id`,
      values
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/jobs/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid job id" });
  }

  try {
    const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/jobs", authenticate, requireRole("company"), async (req, res) => {
  const { title, company, location, type } = req.body;

  if (!title || !company) {
    return res.status(400).json({ message: "title and company are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO jobs (title, company, location, type, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, company, location, type, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/jobs/:id", authenticate, requireRole("company"), async (req, res) => {
  const id = Number(req.params.id);
  const { title, company, location, type } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid job id" });
  }

  if (!title || !company) {
    return res.status(400).json({ message: "title and company are required" });
  }

  try {
    const existing = await pool.query("SELECT user_id FROM jobs WHERE id = $1", [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own jobs" });
    }

    const result = await pool.query(
      "UPDATE jobs SET title = $1, company = $2, location = $3, type = $4 WHERE id = $5 RETURNING *",
      [title, company, location, type, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/jobs/:id", authenticate, requireRole("company"), async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid job id" });
  }

  try {
    const existing = await pool.query("SELECT user_id FROM jobs WHERE id = $1", [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own jobs" });
    }

    const result = await pool.query("DELETE FROM jobs WHERE id = $1 RETURNING *", [id]);

    res.json({ message: "Job deleted", job: result.rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- Applications ----------

app.post("/jobs/:id/applications", authenticate, requireRole("candidate"), async (req, res) => {
  const jobId = Number(req.params.id);
  const { applicant_name, applicant_email, message } = req.body;

  if (!Number.isInteger(jobId)) {
    return res.status(400).json({ message: "Invalid job id" });
  }

  if (!applicant_name || !applicant_email) {
    return res
      .status(400)
      .json({ message: "applicant_name and applicant_email are required" });
  }

  try {
    const job = await pool.query("SELECT id FROM jobs WHERE id = $1", [jobId]);

    if (job.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    const result = await pool.query(
      "INSERT INTO applications (job_id, applicant_name, applicant_email, message) VALUES ($1, $2, $3, $4) RETURNING *",
      [jobId, applicant_name, applicant_email, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/jobs/:id/applications", authenticate, requireRole("company"), async (req, res) => {
  const jobId = Number(req.params.id);

  if (!Number.isInteger(jobId)) {
    return res.status(400).json({ message: "Invalid job id" });
  }

  try {
    const job = await pool.query("SELECT user_id FROM jobs WHERE id = $1", [jobId]);

    if (job.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.rows[0].user_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only view applications for your own jobs" });
    }

    const result = await pool.query(
      "SELECT * FROM applications WHERE job_id = $1 ORDER BY created_at DESC",
      [jobId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- Auth ----------

app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ message: "name, email, password and role are required" });
  }

  if (role !== "company" && role !== "candidate") {
    return res
      .status(400)
      .json({ message: "role must be company or candidate" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "password must be at least 6 characters" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
      [name, email, passwordHash, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;