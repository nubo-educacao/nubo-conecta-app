// Institutions Page — Sprint 3.8
// Lists partner institutions with premium card design.
// Server Component — fetches from institutions + partner_institutions (V1 schema).

import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { getPartnerInstitutions } from '@/services/institutions';
import { BookOpen } from 'lucide-react';

export default async function InstitutionsPage() {
  const institutions = await getPartnerInstitutions();

  return (
    <AppShell>
      <div className="flex flex-col gap-6 px-4 pt-6 pb-24 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1
            className="font-bold text-[20px]"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Instituições Parceiras
          </h1>
          <p
            className="font-normal text-[13px]"
            style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
          >
            Conheça nossas parceiras e suas oportunidades
          </p>
        </div>

        {/* Institution cards */}
        {institutions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-4 rounded-[16px]"
            style={{
              background: 'rgba(255,255,255,0.7)',
              boxShadow: '0px 8px 24px -4px rgba(181,183,192,0.3)',
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(56,177,228,0.1)' }}
            >
              <BookOpen size={24} style={{ color: '#38B1E4' }} />
            </div>
            <p
              className="text-[14px]"
              style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
            >
              Nenhuma instituição parceira cadastrada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((inst) => (
              <Link
                key={inst.id}
                href={`/instituicoes/${inst.id}`}
                className="group block rounded-[16px] overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  boxShadow: '0px 8px 24px -4px rgba(181,183,192,0.3)',
                  background: '#fff',
                }}
              >
                {/* Cover */}
                <div
                  className="w-full h-[140px] relative"
                  style={{
                    background: inst.cover_url
                      ? undefined
                      : inst.brand_color
                        ? inst.brand_color
                        : 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)',
                  }}
                >
                  {inst.cover_url && (
                    <img
                      src={inst.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  {/* Logo overlay */}
                  <div
                    className="absolute bottom-[-28px] left-4 w-[56px] h-[56px] rounded-full bg-white border-2 border-white flex items-center justify-center overflow-hidden"
                    style={{
                      boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {inst.logo_url ? (
                      <img src={inst.logo_url} alt={inst.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <BookOpen size={22} style={{ color: inst.brand_color ?? '#38B1E4' }} />
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 pt-9 pb-4">
                  <h2
                    className="font-bold text-[15px] line-clamp-2"
                    style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {inst.name}
                  </h2>
                  {inst.location && (
                    <p
                      className="text-[12px] mt-1 font-medium"
                      style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
                    >
                      📍 {inst.location}
                    </p>
                  )}
                  {inst.description && (
                    <p
                      className="text-[13px] mt-2 line-clamp-2"
                      style={{ color: 'rgba(58,66,78,0.7)', fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {inst.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
