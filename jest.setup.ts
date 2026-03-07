import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

const encodingGlobal = globalThis as typeof globalThis & {
  TextEncoder: typeof TextEncoder;
  TextDecoder: typeof globalThis.TextDecoder;
};

encodingGlobal.TextEncoder = TextEncoder;
encodingGlobal.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
