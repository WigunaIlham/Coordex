import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { DOCUMENT_HEADER } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SupportedTemplate } from "@/lib/validators/document";

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

function p(
  text: string,
  opts?: { bold?: boolean; align?: Align; underline?: boolean; size?: number },
) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        underline: opts?.underline ? { type: "single" } : undefined,
        size: opts?.size,
      }),
    ],
    alignment: opts?.align,
    spacing: { after: 80 },
  });
}

function emptyLine() {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

function sectionHeading(letter: string, title: string) {
  return new Paragraph({
    children: [new TextRun({ text: `${letter}. ${title}`, bold: true })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 120, after: 80 },
  });
}

/**
 * Formal Indonesian letterhead — universitas + program di tengah, garis tebal +
 * tipis di bawah (standard kop surat resmi).
 */
function kop(subtitle?: string) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: DOCUMENT_HEADER.university,
          bold: true,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: DOCUMENT_HEADER.program,
          bold: true,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${DOCUMENT_HEADER.location} · ${DOCUMENT_HEADER.email}`,
          size: 18,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      border: {
        bottom: {
          color: "000000",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 18,
        },
      },
    }),
    new Paragraph({
      children: [new TextRun({ text: "", size: 4 })],
      border: {
        bottom: {
          color: "000000",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { after: 240 },
    }),
    ...(subtitle
      ? [
          new Paragraph({
            children: [
              new TextRun({
                text: subtitle.toUpperCase(),
                bold: true,
                underline: { type: "single" },
                size: 22,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
        ]
      : []),
  ];
}

/**
 * "Kota, DD Bulan YYYY" line kanan-atas, jabatan, blank space untuk TTD basah,
 * nama tebal + garis bawah, NIM.
 */
function signatureBlock(opts: {
  city: string;
  date: string;
  role: string;
  name: string;
  nim?: string;
  secondaryRole?: string;
  secondaryName?: string;
  secondaryNim?: string;
}) {
  const rows: Paragraph[] = [
    emptyLine(),
    p(`${opts.city}, ${opts.date}`, { align: AlignmentType.RIGHT }),
  ];

  if (opts.secondaryRole && opts.secondaryName) {
    // 2-column signature via a bare table with no borders.
    const row = new TableRow({
      children: [
        new TableCell({
          borders: hiddenBorders(),
          children: [
            p(opts.secondaryRole, { align: AlignmentType.CENTER }),
            emptyLine(),
            emptyLine(),
            emptyLine(),
            p(opts.secondaryName, {
              bold: true,
              underline: true,
              align: AlignmentType.CENTER,
            }),
            ...(opts.secondaryNim
              ? [
                  p(`NIM. ${opts.secondaryNim}`, {
                    align: AlignmentType.CENTER,
                    size: 20,
                  }),
                ]
              : []),
          ],
        }),
        new TableCell({
          borders: hiddenBorders(),
          children: [
            p(opts.role, { align: AlignmentType.CENTER }),
            emptyLine(),
            emptyLine(),
            emptyLine(),
            p(opts.name, {
              bold: true,
              underline: true,
              align: AlignmentType.CENTER,
            }),
            ...(opts.nim
              ? [
                  p(`NIM. ${opts.nim}`, {
                    align: AlignmentType.CENTER,
                    size: 20,
                  }),
                ]
              : []),
          ],
        }),
      ],
    });
    rows.push(
      new Paragraph({ children: [] }),
      // A wrapper paragraph before table
    );
    return [
      ...rows,
      new Table({
        rows: [row],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: hiddenTableBorders(),
      }),
    ];
  }

  // Single signature: right-aligned block
  return [
    ...rows,
    p(opts.role, { align: AlignmentType.RIGHT }),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    p(opts.name, { bold: true, underline: true, align: AlignmentType.RIGHT }),
    ...(opts.nim
      ? [p(`NIM. ${opts.nim}`, { align: AlignmentType.RIGHT, size: 20 })]
      : []),
  ];
}

function hiddenBorders() {
  const b = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: b, bottom: b, left: b, right: b };
}
function hiddenTableBorders() {
  const b = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return {
    top: b,
    bottom: b,
    left: b,
    right: b,
    insideHorizontal: b,
    insideVertical: b,
  };
}

export async function renderDocumentDocx(
  template: SupportedTemplate,
  formData: Record<string, unknown>,
  extra?: { attendees?: { name: string; nim?: string }[] },
): Promise<Buffer> {
  let doc: Document;
  const get = (k: string) => String(formData[k] ?? "");
  const has = (k: string) => Boolean(get(k).trim());
  const num = (k: string) => {
    const v = formData[k];
    return v === undefined || v === null ? null : Number(v);
  };

  switch (template) {
    case "SURAT_UNDANGAN": {
      doc = new Document({
        sections: [
          {
            children: [
              ...kop(),
              p(`Nomor    : ${get("nomorSurat")}`),
              ...(has("lampiran") ? [p(`Lampiran : ${get("lampiran")}`)] : []),
              new Paragraph({
                children: [
                  new TextRun({ text: "Perihal   : " }),
                  new TextRun({ text: get("perihal"), bold: true }),
                ],
                spacing: { after: 200 },
              }),

              p("Kepada Yth.,"),
              p(get("kepada"), { bold: true }),
              ...(has("diTempat") ? [p(`di ${get("diTempat")}`)] : []),
              emptyLine(),

              p("Assalamu'alaikum Warahmatullahi Wabarakatuh."),
              emptyLine(),
              p(get("isiUndangan")),
              p("Kegiatan tersebut akan dilaksanakan pada:"),

              p(`     hari      : ${get("hariKegiatan")}`),
              p(
                `     tanggal   : ${formatDate(get("tanggalKegiatan"), { dateStyle: "full" })}`,
              ),
              p(`     waktu     : ${get("waktuKegiatan")}`),
              p(`     tempat    : ${get("tempatKegiatan")}`),
              p(`     acara     : ${get("acaraKegiatan")}`),
              emptyLine(),

              p(
                "Mengingat pentingnya acara tersebut, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja sama yang baik, kami mengucapkan terima kasih.",
              ),
              emptyLine(),
              p("Wassalamu'alaikum Warahmatullahi Wabarakatuh."),

              ...signatureBlock({
                city: DOCUMENT_HEADER.city,
                date: formatDate(get("tanggal"), { dateStyle: "long" }),
                role: "Ketua Pelaksana,",
                name: get("namaKetua"),
                nim: get("nimKetua"),
                secondaryRole: has("namaSekretaris") ? "Sekretaris," : undefined,
                secondaryName: has("namaSekretaris")
                  ? get("namaSekretaris")
                  : undefined,
                secondaryNim: has("nimSekretaris")
                  ? get("nimSekretaris")
                  : undefined,
              }),
            ],
          },
        ],
      });
      break;
    }

    case "NOTULEN_RAPAT": {
      const attendees = extra?.attendees ?? [];
      const time =
        has("waktuMulai") && has("waktuSelesai")
          ? `${get("waktuMulai")} – ${get("waktuSelesai")} WIB`
          : get("waktuMulai") || "—";
      const hasAbsent = has("pesertaTidakHadir");
      const L = (n: number) => String.fromCharCode(65 + n + (hasAbsent ? 0 : -1) + 1);

      doc = new Document({
        sections: [
          {
            children: [
              ...kop("Notulen Rapat"),

              p(get("judulRapat"), {
                bold: true,
                align: AlignmentType.CENTER,
                size: 24,
              }),
              emptyLine(),

              p(`Hari, Tanggal  : ${formatDate(get("tanggal"), { dateStyle: "full" })}`),
              p(`Waktu           : ${time}`),
              p(`Tempat          : ${get("tempat")}`),
              p(`Pemimpin Rapat  : ${get("pemimpinRapat")}`),
              p(`Notulis         : ${get("notulis")}`),
              emptyLine(),

              sectionHeading("A", "Peserta Hadir"),
              ...(attendees.length === 0
                ? [p("(Belum ada peserta terdaftar)")]
                : attendees.map((a, i) =>
                    p(`   ${i + 1}. ${a.name}${a.nim ? ` — NIM ${a.nim}` : ""}`),
                  )),

              ...(hasAbsent
                ? [
                    sectionHeading("B", "Peserta Tidak Hadir"),
                    p(`   ${get("pesertaTidakHadir")}`),
                  ]
                : []),

              sectionHeading(L(1), "Agenda Rapat"),
              p(`   ${get("agenda")}`),

              sectionHeading(L(2), "Pembahasan"),
              p(`   ${get("pembahasan")}`),

              sectionHeading(L(3), "Keputusan / Kesimpulan"),
              p(`   ${get("hasilRapat")}`),

              ...(has("tindakLanjut")
                ? [
                    sectionHeading(L(4), "Tindak Lanjut"),
                    p(`   ${get("tindakLanjut")}`),
                  ]
                : []),

              ...signatureBlock({
                city: DOCUMENT_HEADER.city,
                date: formatDate(get("tanggal"), { dateStyle: "long" }),
                role: "Mengetahui, Pemimpin Rapat",
                name: get("pemimpinRapat"),
                secondaryRole: "Notulis,",
                secondaryName: get("notulis"),
              }),
            ],
          },
        ],
      });
      break;
    }

    case "DAFTAR_HADIR": {
      const attendees = extra?.attendees ?? [];
      const cell = (text: string, opts?: { bold?: boolean; align?: Align }) =>
        new TableCell({ children: [p(text, opts)] });

      const headerRow = new TableRow({
        tableHeader: true,
        children: [
          cell("No", { bold: true, align: AlignmentType.CENTER }),
          cell("Nama Lengkap", { bold: true }),
          cell("NIM", { bold: true }),
          cell("Tanda Tangan", { bold: true, align: AlignmentType.CENTER }),
        ],
      });
      const rows = attendees.map(
        (a, idx) =>
          new TableRow({
            children: [
              cell(String(idx + 1), { align: AlignmentType.CENTER }),
              cell(a.name),
              cell(a.nim ?? ""),
              cell(" "),
            ],
          }),
      );

      doc = new Document({
        sections: [
          {
            children: [
              ...kop("Daftar Hadir"),

              p(get("namaKegiatan"), {
                bold: true,
                align: AlignmentType.CENTER,
                size: 24,
              }),
              p(
                `${formatDate(get("tanggal"), { dateStyle: "full" })}${
                  has("waktu") ? ` · ${get("waktu")}` : ""
                }`,
                { align: AlignmentType.CENTER, size: 20 },
              ),
              p(`Tempat: ${get("tempat")}`, {
                align: AlignmentType.CENTER,
                size: 20,
              }),
              ...(has("penyelenggara")
                ? [
                    p(`Penyelenggara: ${get("penyelenggara")}`, {
                      align: AlignmentType.CENTER,
                      size: 20,
                    }),
                  ]
                : []),
              emptyLine(),

              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [headerRow, ...rows],
              }),
            ],
          },
        ],
      });
      break;
    }

    case "LPJ": {
      const pemasukan = num("totalPemasukan");
      const pengeluaran = num("totalPengeluaran");
      const saldo =
        pemasukan !== null && pengeluaran !== null ? pemasukan - pengeluaran : null;

      const romans = [
        "I",
        "II",
        "III",
        "IV",
        "V",
        "VI",
        "VII",
        "VIII",
        "IX",
        "X",
        "XI",
      ];
      const sections: {
        title: string;
        render: () => Paragraph[];
      }[] = [
        {
          title: "Pendahuluan",
          render: () => [
            p(
              `Puji syukur kami panjatkan kepada Tuhan Yang Maha Esa atas terlaksananya kegiatan ${get("namaKegiatan")}. Laporan ini disusun sebagai bentuk pertanggungjawaban seluruh rangkaian kegiatan, meliputi persiapan, pelaksanaan, hingga evaluasi.`,
            ),
          ],
        },
        ...(has("landasan")
          ? [
              {
                title: "Landasan Kegiatan",
                render: () => [p(get("landasan"))],
              },
            ]
          : []),
        { title: "Tujuan Kegiatan", render: () => [p(get("tujuan"))] },
        { title: "Sasaran", render: () => [p(get("sasaran"))] },
        {
          title: "Waktu dan Tempat",
          render: () => [
            p(`Waktu    : ${get("waktu")}`),
            p(`Tempat   : ${get("tempat")}`),
            p(`Peserta  : ${get("peserta")}`),
          ],
        },
        ...(has("susunanPanitia")
          ? [
              {
                title: "Susunan Panitia",
                render: () => [p(`   ${get("susunanPanitia")}`)],
              },
            ]
          : []),
        {
          title: "Uraian Kegiatan",
          render: () => [p(get("uraianKegiatan"))],
        },
        ...(has("hambatan")
          ? [
              {
                title: "Hambatan dan Kendala",
                render: () => [p(get("hambatan"))],
              },
            ]
          : []),
        { title: "Evaluasi", render: () => [p(get("evaluasi"))] },
        ...(has("rekomendasi")
          ? [
              {
                title: "Rekomendasi",
                render: () => [p(get("rekomendasi"))],
              },
            ]
          : []),
        ...(pemasukan !== null || pengeluaran !== null
          ? [
              {
                title: "Laporan Keuangan",
                render: () => {
                  const lines: Paragraph[] = [];
                  if (pemasukan !== null)
                    lines.push(
                      p(`Total Pemasukan    : ${formatCurrency(pemasukan)}`),
                    );
                  if (pengeluaran !== null)
                    lines.push(
                      p(`Total Pengeluaran  : ${formatCurrency(pengeluaran)}`),
                    );
                  if (saldo !== null)
                    lines.push(
                      p(`Saldo Akhir        : ${formatCurrency(saldo)}`, {
                        bold: true,
                      }),
                    );
                  return lines;
                },
              },
            ]
          : []),
        {
          title: "Penutup",
          render: () => [
            p(
              `Demikian laporan pertanggungjawaban kegiatan ${get("namaKegiatan")} ini kami susun sebagai bahan evaluasi dan referensi bagi kegiatan selanjutnya. Atas perhatian dan dukungan seluruh pihak, kami mengucapkan terima kasih.`,
            ),
          ],
        },
      ];

      doc = new Document({
        sections: [
          {
            children: [
              ...kop("Laporan Pertanggungjawaban (LPJ)"),
              p(get("namaKegiatan"), {
                bold: true,
                underline: true,
                align: AlignmentType.CENTER,
                size: 24,
              }),
              emptyLine(),
              ...sections.flatMap((s, i) => [
                sectionHeading(romans[i] ?? String(i + 1), s.title),
                ...s.render(),
              ]),
              ...signatureBlock({
                city: DOCUMENT_HEADER.city,
                date: formatDate(new Date().toISOString(), { dateStyle: "long" }),
                role: "Ketua Pelaksana,",
                name: get("namaKetua"),
                nim: get("nimKetua"),
                secondaryRole: has("namaSekretaris")
                  ? "Sekretaris,"
                  : undefined,
                secondaryName: has("namaSekretaris")
                  ? get("namaSekretaris")
                  : undefined,
                secondaryNim: has("nimSekretaris")
                  ? get("nimSekretaris")
                  : undefined,
              }),
            ],
          },
        ],
      });
      break;
    }
  }

  return Packer.toBuffer(doc);
}
