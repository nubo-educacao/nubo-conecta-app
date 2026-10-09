// Vagas ProUni de uma opportunity a partir de opportunities_prouni_vacancies.
//
// Desde a migration 20260828100000 (admin) cada opportunity ProUni é UMA modalidade
// (concurrency_type AMPLA / COTA_PPI / COTA_PCD; dados legados podem trazer só "PPI")
// e as vagas vêm em qt_ofertada. As antigas colunas bolsas_ampla_ofertada /
// bolsas_cota_ofertada não existem mais.

export interface ProuniVacancyRow {
  qt_ofertada?: number | string | null;
}

export function prouniVacancies(
  rows: ProuniVacancyRow[],
  concurrencyType: string | null | undefined,
): { broad_competition_offered: number; quotas_offered: number } {
  const ofertadas = rows.reduce((sum, v) => sum + (Number(v.qt_ofertada) || 0), 0);
  const isAmpla = !concurrencyType || /^AMPLA/i.test(concurrencyType);
  return {
    broad_competition_offered: isAmpla ? ofertadas : 0,
    quotas_offered: isAmpla ? 0 : ofertadas,
  };
}
