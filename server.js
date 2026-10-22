const express = require("express");
const pool = require("./db");

const app = express();
app.use(express.json());

const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Hello from my API!");
});

app.get("/jobs", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM jobs ORDER BY id");
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

app.post("/jobs", async (req, res) => {
  const { title, company, location, type } = req.body;

  if (!title || !company) {
    return res.status(400).json({ message: "title and company are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO jobs (title, company, location, type) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, company, location, type]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});
app.delete("/jobs/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid job id" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM jobs WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted", job: result.rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});
app.put("/jobs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, company, location, type } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid job id" });
  }

  if (!title || !company) {
    return res.status(400).json({ message: "title and company are required" });
  }

  try {
    const result = await pool.query(
      "UPDATE jobs SET title = $1, company = $2, location = $3, type = $4 WHERE id = $5 RETURNING *",
      [title, company, location, type, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});