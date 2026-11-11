import GuestOrderClient from '@/components/GuestOrderClient';
import { getLiveMenuItems } from '@/lib/menu';

export const dynamic = 'force-dynamic';

export default async function GuestOrderPage() {
  const { items, error } = await getLiveMenuItems();
  return <GuestOrderClient initialMenuItems={items} initialMenuError={error} />;
}
