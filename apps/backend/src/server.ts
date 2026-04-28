import { createApp } from "./app";
import { PORT } from "./config/env";

const server = createApp();

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});