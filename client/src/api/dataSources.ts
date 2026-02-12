const API_BASE = "http://localhost:8000/api/v1/data_sources";

function authHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  };
}

export async function fetchAllFiles() {
  const res = await fetch(`${API_BASE}/all`, {
    headers: authHeader(),
  });

  if (!res.ok) throw new Error("Failed to fetch files");
  return res.json();
}

export async function fetchFileData(filename: string) {
  const res = await fetch(`${API_BASE}/get-file/${filename}`, {
    headers: authHeader(),
  });

  if (!res.ok) throw new Error("Failed to fetch file data");
  return res.json();
}
