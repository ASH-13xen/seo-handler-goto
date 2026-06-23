declare module "mammoth" {
  export interface MammothImage {
    contentType: string;
    readAsBuffer(): Promise<Buffer>;
  }

  export interface MammothMessage {
    type: string;
    message: string;
  }

  export interface MammothResult {
    value: string;
    messages: MammothMessage[];
  }

  export interface ConvertToHtmlOptions {
    convertImage?: (image: MammothImage) => Promise<{ src: string }>;
  }

  export function convertToHtml(
    input: { buffer: Buffer },
    options?: ConvertToHtmlOptions,
  ): Promise<MammothResult>;

  export const images: {
    imgElement: (
      handler: (image: MammothImage) => Promise<{ src: string }>,
    ) => (image: MammothImage) => Promise<{ src: string }>;
  };
}
