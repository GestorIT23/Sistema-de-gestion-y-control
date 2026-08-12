export const isAuthorizedToDelete = (userEmail?: string): boolean => {
  if (!userEmail) return false;
  const emailLower = userEmail.toLowerCase().trim();
  return (
    emailLower.includes('gestor.it') ||
    emailLower.includes('luis.marroquin') ||
    emailLower.includes('luis.marroquion')
  );
};
