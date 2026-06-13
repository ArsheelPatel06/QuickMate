import { redirect } from 'next/navigation';

// /manufacturing/boms → reuse the existing BOM list page
export default function ManufacturingBOMsRedirect() {
  redirect('/boms');
}
