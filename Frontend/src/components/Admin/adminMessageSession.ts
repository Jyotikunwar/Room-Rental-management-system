export const ADMIN_MESSAGE_CONTACT_KEY = "adminMessageContactId";

export function openAdminMessage(contactId: number) {
  sessionStorage.setItem(ADMIN_MESSAGE_CONTACT_KEY, String(contactId));
}
