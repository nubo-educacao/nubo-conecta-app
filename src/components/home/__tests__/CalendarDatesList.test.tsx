// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CalendarDatesList from "../CalendarDatesList";
import type { IImportantDate } from "@/services/importantDates";

describe("CalendarDatesList", () => {
  it("exibe datas com intervalo que transborda o mês selecionado (overlap)", () => {
    const dates: IImportantDate[] = [
      {
        id: "1",
        title: "Inscrição ProUni",
        description: "Período de inscrições",
        date: "2026-06-25T00:00:00.000Z",
        endDate: "2026-07-05T23:59:59.000Z",
        type: "prouni",
        category: "purple",
        is_urgent: true,
        created_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    // Julho 2026
    const selectedMonth = new Date(2026, 6, 1);

    render(<CalendarDatesList dates={dates} selectedMonth={selectedMonth} />);

    expect(screen.getByText("Inscrição ProUni")).toBeInTheDocument();
    expect(screen.getByText("ProUni")).toBeInTheDocument();
  });

  it("exibe badge correto para tipo parceiros e sisu", () => {
    const dates: IImportantDate[] = [
      {
        id: "2",
        title: "Edital Insper",
        description: "Processo seletivo",
        date: "2026-07-10T00:00:00.000Z",
        type: "partners",
        category: "orange",
        is_urgent: false,
        created_at: "2026-07-01T00:00:00.000Z",
      },
    ];

    const selectedMonth = new Date(2026, 6, 1);

    render(<CalendarDatesList dates={dates} selectedMonth={selectedMonth} />);

    expect(screen.getByText("Edital Insper")).toBeInTheDocument();
    expect(screen.getByText("Parceiros")).toBeInTheDocument();
  });
});
