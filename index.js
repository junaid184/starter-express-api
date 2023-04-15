import express from "express";
const app = express();
import path from "path";
const __dirname = path.resolve();
import sessionStart from "./puppeteer.js";
import cors from "cors";
const PORT = process.env.PORT || 8000;
app.use(express.json());

app.get("/", (req, res, next) => {
    res.sendFile(path.join(__dirname, "./frontend/bootstrap.html"));
});

app.post("/getdata", async (req, res, next) => {
    console.log(req.body);
    const data = await sessionStart(req.body.url);
    res.send(data);
})

app.listen(PORT, () => {
    console.log(`your app is listening at http://localhost:${PORT}`);
})