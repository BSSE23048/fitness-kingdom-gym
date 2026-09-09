/**
 * Helper to resolve active owner's display name for audit trails and greetings
 */
export const getOwnerDisplayName = (userOrData) => {
  if (!userOrData) return 'Gym Owner';

  const email = (userOrData.email || '').toLowerCase();
  const displayName = userOrData.displayName;

  if (email.includes('ahmad') || email.includes('ahmed')) return 'Ahmad';
  if (email.includes('mohsin')) return 'Mohsin';

  if (displayName && displayName !== 'Gym Owner') {
    return displayName;
  }

  if (email) {
    const prefix = email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  return 'Gym Owner';
};

/**
 * Returns audit stamp string for transactions (e.g. "Ahmad" or "Mohsin")
 */
export const getOwnerStamp = (userOrData) => {
  return getOwnerDisplayName(userOrData);
};
