import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';

export default function HomePage() {
  // Create a new chat and redirect to it
  const chatId = nanoid();
  redirect(`/chat/${chatId}`);
}
