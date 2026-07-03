import { Document, Page, Text, View } from "@react-pdf/renderer";

import { DOCUMENT_HEADER } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SignatureBlock, SuratHeader } from "./header";
import { styles } from "./styles";

type Data = {
  namaKegiatan: string;
  landasan?: string;
  tujuan: string;
  sasaran: string;
  waktu: string;
  tempat: string;
  peserta: string;
  susunanPanitia?: string;
  uraianKegiatan: string;
  hambatan?: string;
  evaluasi: string;
  rekomendasi?: string;
  totalPemasukan?: number | string;
  totalPengeluaran?: number | string;
  namaKetua: string;
  nimKetua: string;
  namaSekretaris?: string;
  nimSekretaris?: string;
};

/**
 * Numbered sections use Roman numerals — standard for Indonesian formal
 * reports (LPJ, proposal). Optional sections are compacted so numbering
 * remains contiguous.
 */
export function LPJPDF({ data }: { data: Data }) {
  const pemasukan =
    data.totalPemasukan !== undefined && data.totalPemasukan !== null
      ? Number(data.totalPemasukan)
      : null;
  const pengeluaran =
    data.totalPengeluaran !== undefined && data.totalPengeluaran !== null
      ? Number(data.totalPengeluaran)
      : null;
  const saldo =
    pemasukan !== null && pengeluaran !== null ? pemasukan - pengeluaran : null;

  // Section list — filter falsy so numbering stays sequential.
  const sections: { title: string; render: () => React.ReactNode }[] = [
    {
      title: "Pendahuluan",
      render: () => (
        <Text style={styles.paragraph}>
          Puji syukur kami panjatkan kepada Tuhan Yang Maha Esa atas
          terlaksananya kegiatan {data.namaKegiatan}. Laporan ini disusun sebagai
          bentuk pertanggungjawaban seluruh rangkaian kegiatan, meliputi
          persiapan, pelaksanaan, hingga evaluasi.
        </Text>
      ),
    },
    ...(data.landasan
      ? [
          {
            title: "Landasan Kegiatan",
            render: () => <Text>{data.landasan}</Text>,
          },
        ]
      : []),
    { title: "Tujuan Kegiatan", render: () => <Text>{data.tujuan}</Text> },
    { title: "Sasaran", render: () => <Text>{data.sasaran}</Text> },
    {
      title: "Waktu dan Tempat",
      render: () => (
        <View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Waktu</Text>
            <Text style={styles.fieldValue}>: {data.waktu}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tempat</Text>
            <Text style={styles.fieldValue}>: {data.tempat}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Peserta</Text>
            <Text style={styles.fieldValue}>: {data.peserta}</Text>
          </View>
        </View>
      ),
    },
    ...(data.susunanPanitia
      ? [
          {
            title: "Susunan Panitia",
            render: () => (
              <Text style={{ marginLeft: 12 }}>{data.susunanPanitia}</Text>
            ),
          },
        ]
      : []),
    {
      title: "Uraian Kegiatan",
      render: () => (
        <Text style={styles.paragraphNoIndent}>{data.uraianKegiatan}</Text>
      ),
    },
    ...(data.hambatan
      ? [
          {
            title: "Hambatan dan Kendala",
            render: () => <Text>{data.hambatan}</Text>,
          },
        ]
      : []),
    { title: "Evaluasi", render: () => <Text>{data.evaluasi}</Text> },
    ...(data.rekomendasi
      ? [
          {
            title: "Rekomendasi",
            render: () => <Text>{data.rekomendasi}</Text>,
          },
        ]
      : []),
    ...(pemasukan !== null || pengeluaran !== null
      ? [
          {
            title: "Laporan Keuangan",
            render: () => (
              <View>
                {pemasukan !== null && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Total Pemasukan</Text>
                    <Text style={styles.fieldValue}>
                      : {formatCurrency(pemasukan)}
                    </Text>
                  </View>
                )}
                {pengeluaran !== null && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Total Pengeluaran</Text>
                    <Text style={styles.fieldValue}>
                      : {formatCurrency(pengeluaran)}
                    </Text>
                  </View>
                )}
                {saldo !== null && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Saldo Akhir</Text>
                    <Text style={[styles.fieldValue, styles.bold]}>
                      : {formatCurrency(saldo)}
                    </Text>
                  </View>
                )}
              </View>
            ),
          },
        ]
      : []),
    {
      title: "Penutup",
      render: () => (
        <Text style={styles.paragraph}>
          Demikian laporan pertanggungjawaban kegiatan {data.namaKegiatan} ini
          kami susun sebagai bahan evaluasi dan referensi bagi kegiatan
          selanjutnya. Atas perhatian dan dukungan seluruh pihak, kami
          mengucapkan terima kasih.
        </Text>
      ),
    },
  ];

  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <SuratHeader subtitle="Laporan Pertanggungjawaban (LPJ)" />

        <Text
          style={{
            ...styles.bold,
            fontSize: 12,
            textAlign: "center",
            marginTop: 4,
            marginBottom: 14,
            textDecoration: "underline",
          }}
        >
          {data.namaKegiatan}
        </Text>

        {sections.map((s, i) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionHeading}>
              {romans[i] ?? String(i + 1)}. {s.title}
            </Text>
            {s.render()}
          </View>
        ))}

        <SignatureBlock
          city={DOCUMENT_HEADER.city}
          date={formatDate(new Date().toISOString(), { dateStyle: "long" })}
          role="Ketua Pelaksana,"
          name={data.namaKetua}
          nim={data.nimKetua}
          secondaryRole={data.namaSekretaris ? "Sekretaris," : undefined}
          secondaryName={data.namaSekretaris}
          secondaryNim={data.nimSekretaris}
        />
      </Page>
    </Document>
  );
}
