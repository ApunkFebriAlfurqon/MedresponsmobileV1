export async function listCapturedPhotos() {
  return [];
}

export async function saveCapturedPhoto() {
  throw new Error('Penyimpanan foto lokal sementara hanya tersedia di Android dan iOS.');
}

export async function deleteCapturedPhoto() {
  return undefined;
}
