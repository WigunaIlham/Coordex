import { Document, Page, Text, View } from "@react-pdf/renderer";

import { DOCUMENT_HEADER } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { SignatureBlock, SuratHeader } from "./header";
import { styles } from "./styles";

type Data = {
  nomorSurat: string;
  lampiran?: string;
  tanggal: string;
  perihal: string;
  kepada: string;
  diTempat?: string;
  isiUndangan: string;
  hariKegiatan: string;
  tanggalKegiatan: string;
  waktuKegiatan: string;
  tempatKegiatan: string;
  acaraKegiatan: string;
  namaKetua: string;
  nimKetua: string;
  namaSekretaris?: string;
  nimSekretaris?: string;
};

export function SuratUndanganPDF({ data }: { data: Data }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <SuratHeader />

        {/* Meta surat: Nomor, Lampiran, Perihal — di kiri */}
        <View style={{ marginTop: 8, marginBottom: 12 }}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Nomor</Text>
            <Text style={styles.fieldValue}>: {data.nomorSurat}</Text>
          </View>
          {data.lampiran && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Lampiran</Text>
              <Text style={styles.fieldValue}>: {data.lampiran}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Perihal</Text>
            <Text style={[styles.fieldValue, styles.bold]}>: {data.perihal}</Text>
          </View>
        </View>

        {/* Kepada */}
        <View style={{ marginBottom: 12 }}>
          <Text>Kepada Yth.,</Text>
          <Text style={{ ...styles.bold, marginTop: 2 }}>{data.kepada}</Text>
          {data.diTempat && <Text style={{ marginTop: 2 }}>di {data.diTempat}</Text>}
        </View>

        {/* Salam pembuka */}
        <Text style={styles.paragraphNoIndent}>
          Assalamu&apos;alaikum Warahmatullahi Wabarakatuh.
        </Text>

        {/* Isi pengantar */}
        <Text style={styles.paragraph}>{data.isiUndangan}</Text>

        <Text style={styles.paragraphNoIndent}>
          Kegiatan tersebut akan dilaksanakan pada:
        </Text>

        {/* Rincian kegiatan — meta table indented */}
        <View style={styles.metaTable}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>hari</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>{data.hariKegiatan}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>tanggal</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>
              {formatDate(data.tanggalKegiatan, { dateStyle: "full" })}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>waktu</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>{data.waktuKegiatan}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>tempat</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>{data.tempatKegiatan}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>acara</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>{data.acaraKegiatan}</Text>
          </View>
        </View>

        {/* Penutup */}
        <Text style={styles.paragraph}>
          Mengingat pentingnya acara tersebut, kami sangat mengharapkan kehadiran
          Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja sama yang baik,
          kami mengucapkan terima kasih.
        </Text>
        <Text style={styles.paragraphNoIndent}>
          Wassalamu&apos;alaikum Warahmatullahi Wabarakatuh.
        </Text>

        {/* Signature */}
        <SignatureBlock
          city={DOCUMENT_HEADER.city}
          date={formatDate(data.tanggal, { dateStyle: "long" })}
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
