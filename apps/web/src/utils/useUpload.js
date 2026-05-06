import * as React from 'react';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  UPLOAD_FILE_TOO_LARGE_MESSAGE,
} from "@/utils/uploadLimits";

function useUpload() {
  const [loading, setLoading] = React.useState(false);
  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);
      let response;
      if ("file" in input && input.file) {
        if (input.file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
          throw new Error(UPLOAD_FILE_TOO_LARGE_MESSAGE);
        }
        const formData = new FormData();
        formData.append("file", input.file);
        response = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
      } else if ("url" in input) {
        response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: input.url })
        });
      } else if ("base64" in input) {
        response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ base64: input.base64 })
        });
      } else {
        response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream"
          },
          body: input.buffer
        });
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error(data?.error || UPLOAD_FILE_TOO_LARGE_MESSAGE);
        }
        throw new Error(data?.error || "Upload failed");
      }
      return { url: data.url, mimeType: data.mimeType || null };
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        return { error: uploadError.message };
      }
      if (typeof uploadError === "string") {
        return { error: uploadError };
      }
      return { error: "Upload failed" };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;
