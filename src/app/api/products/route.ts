export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  sku: z.string().min(1), name: z.string().min(1),
  categoryId: z.coerce.number(),
  brandId: z.coerce.number().optional().nullable(),
  unit: z.string().default('cái'),
  costPrice: z.coerce.number().min(0), sellPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().default(0), minStock: z.coerce.number().int().default(3),
  warrantyMonths: z.coerce.number().int().default(12),
  trackSerial: z.boolean().default(false),
  specs: z.any().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const categoryId = searchParams.get('categoryId');
  const brandId = searchParams.get('brandId');
  const trackSerial = searchParams.get('trackSerial');
  const stockStatus = searchParams.get('stockStatus');
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') ?? 'desc') as 'asc' | 'desc';

  const where: any = { active: true };
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { sku: { contains: search, mode: 'insensitive' } },
  ];
  if (categoryId) where.categoryId = Number(categoryId);
  if (brandId) where.brandId = Number(brandId);
  if (trackSerial === '1') where.trackSerial = true;
  if (trackSerial === '0') where.trackSerial = false;
  if (stockStatus === 'out') where.stock = 0;
  if (stockStatus === 'in') where.stock = { gt: 0 };

  let data = await prisma.product.findMany({
    where,
    include: { category: true, brand: true },
  });

  if (stockStatus === 'low') data = data.filter((p) => p.stock > 0 && p.stock < p.minStock);

  data.sort((a, b) => {
    let av: any, bv: any;
    switch (sortBy) {
      case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
      case 'sku': av = a.sku.toLowerCase(); bv = b.sku.toLowerCase(); break;
      case 'stock': av = a.stock; bv = b.stock; break;
      case 'sellPrice': av = Number(a.sellPrice); bv = Number(b.sellPrice); break;
      case 'costPrice': av = Number(a.costPrice); bv = Number(b.costPrice); break;
      default: av = a.createdAt; bv = b.createdAt;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());
    const session = await getServerSession(authOptions);
    const p = await prisma.product.create({ data });
    if (session) {
      await logAudit({
        userId: session.user.id,
        userName: session.user.name || session.user.email,
        action: 'CREATE',
        entity: 'Product',
        entityId: p.id,
        description: `Tạo SP "${p.name}" (${p.sku})`,
        metadata: { sku: p.sku, name: p.name, sellPrice: Number(p.sellPrice), costPrice: Number(p.costPrice), stock: p.stock },
      });
    }
    return NextResponse.json(p, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
