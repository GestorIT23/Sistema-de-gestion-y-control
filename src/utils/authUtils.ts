export const isAuthorizedToDelete = (userEmail?: string): boolean => {
  if (!userEmail) return false;
  const emailLower = userEmail.toLowerCase().trim();
  return (
    emailLower.includes('gestor.it') ||
    emailLower.includes('gestor') ||
    emailLower.includes('it@') ||
    emailLower === 'it' ||
    emailLower.includes('luis.marroquin') ||
    emailLower.includes('luis.marroquion') ||
    emailLower.includes('admin') ||
    emailLower.includes('supervisor')
  );
};
