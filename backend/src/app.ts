import express from "express";
import cors from "cors";
import helmet from "helmet";
import healthRouter from "./routes/health";
import usersRouter from "./routes/users";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/users", usersRouter);

export default app;
