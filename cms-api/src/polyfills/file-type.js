import { filetypeinfo } from "magic-bytes.js";

export async function fileTypeFromFile(path) {
  console.warn("fileTypeFromFile no soportado en Workers");
  return null;
}

export async function fileTypeFromBuffer(buffer) {
  const result = filetypeinfo(new Uint8Array(buffer));
  if (!result.length) return null;
  return {
    ext: result[0].extension,
    mime: result[0].mime,
  };
}

export async function fileTypeFromStream(stream) {
  const reader = stream.getReader();
  const { value, done } = await reader.read();
  reader.releaseLock();
  if (done || !value) return null;
  return fileTypeFromBuffer(value.buffer);
}

export async function fileTypeFromBlob(blob) {
  const buffer = await blob.arrayBuffer();
  return fileTypeFromBuffer(buffer);
}
