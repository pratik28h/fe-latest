export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    "http://localhost:8000/api/v1/data_sources/upload",
    {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaWRkaGVzaDI5MDlAZ21haWwuY29tIiwiZXhwIjoxNzcxMzEzMDUzfQ.bzRRtcspXEH-h00PN9x9je53pjDAMtD3i00Am-UZSrg`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "File upload failed");
  }

  return response.json();
}
