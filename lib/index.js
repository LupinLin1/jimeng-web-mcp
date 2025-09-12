import {
  ASPECT_RATIO_PRESETS,
  ImageDimensionCalculator,
  generateImage,
  generateVideo,
  startServer
} from "./chunk-LEG7AZ4A.js";

// src/index.ts
process.on("uncaughtException", (error) => {
  console.error("\u672A\u6355\u83B7\u7684\u5F02\u5E38:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u672A\u5904\u7406\u7684Promise\u62D2\u7EDD:", reason);
});
var main = async () => {
  try {
    if (!process.env.JIMENG_API_TOKEN) {
      throw new Error("JIMENG_API_TOKEN is required!");
    }
    await startServer();
  } catch (error) {
    console.error("\u542F\u52A8\u670D\u52A1\u5668\u65F6\u51FA\u9519:", error);
    process.exit(1);
  }
};
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export {
  ASPECT_RATIO_PRESETS,
  ImageDimensionCalculator,
  generateImage,
  generateVideo
};
//# sourceMappingURL=index.js.map