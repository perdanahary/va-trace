import { salesPointSeeds } from "@/lib/salesPointSeed";
import type { SalesPointMapping } from "@/lib/types/salesPoint";

const boundClient = {
  clientId: "CUS-SAMPOERNA",
  clientName: "Sampoerna",
  clientEntityName: "PT HM Sampoerna Tbk",
} as const;

const baseSalesPoints: Omit<SalesPointMapping, "clientId" | "clientName" | "clientEntityName" | "pic1" | "pic2" | "remarks" | "note" | "shippingAddress" | "subArea">[] = [
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Barat",
    "wcode": "WH055",
    "salesPoint": "Jakarta Barat"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Selatan",
    "wcode": "WH071",
    "salesPoint": "Jakarta Selatan"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Timur",
    "wcode": "WH064",
    "salesPoint": "Jakarta Timur"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Selatan",
    "wcode": "WH299",
    "salesPoint": "Pondok Pinang Jaksel"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Depok",
    "wcode": "WH059",
    "salesPoint": "Depok"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Pusat",
    "wcode": "WH069",
    "salesPoint": "Jakarta Pusat"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Utara",
    "wcode": "WH052",
    "salesPoint": "Jakarta Utara"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Bogor",
    "wcode": "WH060",
    "salesPoint": "Bogor"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Serang",
    "wcode": "WH068",
    "salesPoint": "Serang"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Bekasi",
    "wcode": "WH075",
    "salesPoint": "Bekasi"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Karawang",
    "wcode": "WH066",
    "salesPoint": "Karawang"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Tangerang",
    "wcode": "WH057",
    "salesPoint": "Tangerang"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Outer",
    "area": "Rangkasbitung",
    "wcode": "WH077",
    "salesPoint": "Rangkasbitung"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 2",
    "wcode": "WH090",
    "salesPoint": "Bandung 2"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 2",
    "wcode": "WH169",
    "salesPoint": "DPC Sumedang"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Garut",
    "wcode": "WH083",
    "salesPoint": "Garut"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 1",
    "wcode": "WH089",
    "salesPoint": "Bandung 1"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 3",
    "wcode": "WH078",
    "salesPoint": "Bandung 3"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Cirebon",
    "wcode": "WH084",
    "salesPoint": "Cirebon"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Sukabumi",
    "wcode": "WH079",
    "salesPoint": "Sukabumi"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Tasikmalaya",
    "wcode": "WH082",
    "salesPoint": "Tasikmalaya"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Madiun",
    "wcode": "WH111",
    "salesPoint": "Madiun"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Magelang",
    "wcode": "WH108",
    "salesPoint": "Magelang"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Purwokerto",
    "wcode": "WH087",
    "salesPoint": "Purwokerto"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Salatiga",
    "wcode": "WH112",
    "salesPoint": "Salatiga"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Surakarta",
    "wcode": "WH109",
    "salesPoint": "Surakarta"
  },
  {
    "zone": "Central Java",
    "region": "Java 2",
    "area": "Yogyakarta",
    "wcode": "WH106",
    "salesPoint": "Yogyakarta"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Kediri",
    "wcode": "WH117",
    "salesPoint": "Kediri"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Pati",
    "wcode": "WH104",
    "salesPoint": "Pati"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Semarang",
    "wcode": "WH099",
    "salesPoint": "Semarang"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Tegal",
    "wcode": "WH101",
    "salesPoint": "Tegal"
  },
  {
    "zone": "Central Java",
    "region": "Java 3",
    "area": "Tuban",
    "wcode": "WH115",
    "salesPoint": "Tuban"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Surabaya",
    "wcode": "WH131",
    "salesPoint": "Surabaya"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Jember",
    "wcode": "WH122",
    "salesPoint": "DPC Banyuwangi"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Jember",
    "wcode": "WH120",
    "salesPoint": "Jember"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Pamekasan",
    "wcode": "WH119",
    "salesPoint": "Pamekasan"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Gresik",
    "wcode": "WH124",
    "salesPoint": "Gresik"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Mojokerto",
    "wcode": "WH126",
    "salesPoint": "Mojokerto"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Probolinggo",
    "wcode": "WH123",
    "salesPoint": "Probolinggo"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Malang",
    "wcode": "WH116",
    "salesPoint": "Malang"
  },
  {
    "zone": "East Java",
    "region": "Java 4",
    "area": "Sidoarjo",
    "wcode": "WH129",
    "salesPoint": "Sidoarjo"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Denpasar",
    "wcode": "WH133",
    "salesPoint": "Denpasar"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH137",
    "salesPoint": "EZD Alor"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH137",
    "salesPoint": "EZD Atambua"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH137",
    "salesPoint": "Kupang"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Mataram",
    "wcode": "WH273",
    "salesPoint": "EZD Sumbawa - Bima"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Mataram",
    "wcode": "WH273",
    "salesPoint": "EZD Sumbawa - Sumbawa"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Mataram",
    "wcode": "WH136",
    "salesPoint": "Mataram"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH244",
    "salesPoint": "DPC Ende"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH271",
    "salesPoint": "DPC Ruteng"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH270",
    "salesPoint": "EZD Maumere"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Kupang",
    "wcode": "WH266",
    "salesPoint": "EZD Sumba"
  },
  {
    "zone": "East Java",
    "region": "Bali NT",
    "area": "Denpasar",
    "wcode": "WH135",
    "salesPoint": "DPC Singaraja"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Balikpapan",
    "wcode": "WH145",
    "salesPoint": "Balikpapan"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Banjarmasin",
    "wcode": "WH140",
    "salesPoint": "Banjarmasin"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Banjarmasin",
    "wcode": "WH141",
    "salesPoint": "DPC Barabai"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Banjarmasin",
    "wcode": "WH141",
    "salesPoint": "EZD Kotabaru"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Berau",
    "wcode": "WH231",
    "salesPoint": "Sales Point Nunukan"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Berau",
    "wcode": "WH274",
    "salesPoint": "Sales Point Tanjung Redeb"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Berau",
    "wcode": "WH275",
    "salesPoint": "Sales Point Tarakan"
  },
  {
    "zone": "East",
    "region": "Kalimantan 1",
    "area": "Samarinda",
    "wcode": "WH143",
    "salesPoint": "Samarinda"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Palangkaraya",
    "wcode": "WH241",
    "salesPoint": "EZD Pangkalan Bun"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Palangkaraya",
    "wcode": "WH277",
    "salesPoint": "EZD Sampit"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Palangkaraya",
    "wcode": "WH142",
    "salesPoint": "Palangkaraya"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Pontianak",
    "wcode": "WH245",
    "salesPoint": "EZD Ketapang"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Pontianak",
    "wcode": "WH138",
    "salesPoint": "Pontianak"
  },
  {
    "zone": "East",
    "region": "Kalimantan 2",
    "area": "Sintang",
    "wcode": "WH139",
    "salesPoint": "Sintang"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Manado",
    "wcode": "WH007",
    "salesPoint": "Manado"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Pare-Pare",
    "wcode": "WH006",
    "salesPoint": "DPC Palopo"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Kendari",
    "wcode": "WH278",
    "salesPoint": "EZD Bau-Bau"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Palu",
    "wcode": "WH280",
    "salesPoint": "EZD Luwuk"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Gorontalo",
    "wcode": "WH010",
    "salesPoint": "Gorontalo"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Palu",
    "wcode": "WH009",
    "salesPoint": "Palu"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Pare-Pare",
    "wcode": "WH005",
    "salesPoint": "Pare-Pare"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Kendari",
    "wcode": "WH016",
    "salesPoint": "Kendari"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Makassar 1",
    "wcode": "WH004",
    "salesPoint": "Makassar 1"
  },
  {
    "zone": "East",
    "region": "Sulawesi 1",
    "area": "Makassar 2",
    "wcode": "WH014",
    "salesPoint": "Makassar 2"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Ambon",
    "wcode": "WH008",
    "salesPoint": "Ambon"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Ambon",
    "wcode": "WH282",
    "salesPoint": "EZD Tual"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH285",
    "salesPoint": "EZD Merauke"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH286",
    "salesPoint": "EZD Nabire"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH289",
    "salesPoint": "Sales Point Fak-Fak"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH012",
    "salesPoint": "Sales Point Kaimana"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH290",
    "salesPoint": "Sales Point Manokwari"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH288",
    "salesPoint": "Sales Point Timika"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Sorong",
    "wcode": "WH012",
    "salesPoint": "Sorong"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Ternate",
    "wcode": "WH011",
    "salesPoint": "Ternate"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH283",
    "salesPoint": "EZD Biak"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH287",
    "salesPoint": "EZD Serui"
  },
  {
    "zone": "East",
    "region": "Sulawesi 2",
    "area": "Jayapura",
    "wcode": "WH013",
    "salesPoint": "Jayapura"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Padang",
    "wcode": "WH032",
    "salesPoint": "DPC Solok"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Padang",
    "wcode": "WH031",
    "salesPoint": "Padang"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Bukittinggi",
    "wcode": "WH033",
    "salesPoint": "Bukittinggi"
  },
  {
    "zone": "Jakarta",
    "region": "Jakarta Inner",
    "area": "Jakarta Timur",
    "wcode": "WH295",
    "salesPoint": "Pasar Minggu"
  },
  {
    "zone": "West Java",
    "region": "Java 1",
    "area": "Bandung 3",
    "wcode": "WH096",
    "salesPoint": "DPC Padalarang"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Lhokseumawe",
    "wcode": "WH026",
    "salesPoint": "Lhokseumawe"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Medan 1",
    "wcode": "WH020",
    "salesPoint": "Medan 1"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Medan 2",
    "wcode": "WH021",
    "salesPoint": "Medan 2"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Tanah Karo",
    "wcode": "WH017",
    "salesPoint": "Tanah Karo"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Banda Aceh",
    "wcode": "WH024",
    "salesPoint": "Banda Aceh"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Pematang Siantar",
    "wcode": "WH022",
    "salesPoint": "Pematang Siantar"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Kisaran",
    "wcode": "WH030",
    "salesPoint": "Kisaran"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 1",
    "area": "Padang Sidempuan",
    "wcode": "WH028",
    "salesPoint": "Padang Sidempuan"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Batam",
    "wcode": "WH038",
    "salesPoint": "Batam"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Air Molek",
    "wcode": "WH037",
    "salesPoint": "Air Molek"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Duri",
    "wcode": "WH036",
    "salesPoint": "Duri"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Tanjung Pinang",
    "wcode": "WH256",
    "salesPoint": "EZD Tanjung Balai Karimun"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Pekanbaru",
    "wcode": "WH034",
    "salesPoint": "Pekanbaru"
  },
  {
    "zone": "North Sumatera",
    "region": "Sumatera 2",
    "area": "Tanjung Pinang",
    "wcode": "WH039",
    "salesPoint": "Tanjung Pinang"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Lahat",
    "wcode": "WH045",
    "salesPoint": "Lahat"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Jambi",
    "wcode": "WH047",
    "salesPoint": "Jambi"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Palembang 1",
    "wcode": "WH044",
    "salesPoint": "Palembang 1"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Muara Bungo",
    "wcode": "WH048",
    "salesPoint": "Muara Bungo"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Palembang 2",
    "wcode": "WH179",
    "salesPoint": "Palembang 2"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Lahat",
    "wcode": "WH046",
    "salesPoint": "DPC Baturaja"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Pangkal Pinang",
    "wcode": "WH258",
    "salesPoint": "EZD Bangka"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 3",
    "area": "Pangkal Pinang",
    "wcode": "WH259",
    "salesPoint": "EZD Belitung"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bandar Lampung",
    "wcode": "WH041",
    "salesPoint": "Bandar Lampung"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bengkulu",
    "wcode": "WH049",
    "salesPoint": "Bengkulu"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Kotabumi",
    "wcode": "WH042",
    "salesPoint": "Kotabumi"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Metro",
    "wcode": "WH156",
    "salesPoint": "Metro"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bandar Lampung",
    "wcode": "WH166",
    "salesPoint": "DPC Pringsewu"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bengkulu",
    "wcode": "WH051",
    "salesPoint": "DPC Lubuk Linggau"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Bandar Lampung",
    "wcode": "WH167",
    "salesPoint": "DPC Kalianda"
  },
  {
    "zone": "South Sumatera",
    "region": "Sumatera 4",
    "area": "Kotabumi",
    "wcode": "WH212",
    "salesPoint": "DPC Tulang Bawang"
  }
];

const emptyPic = { name: "", email: "", phone: "" };
const emptyAddress = { provinsi: "", kotaKabupaten: "", kecamatan: "", alamat: "", kodePos: "" };

function findSeed(zone: string, region: string, area: string, salesPointName: string) {
  const areaSeeds = salesPointSeeds.filter(
    (s) => s.zone === zone && s.region === region && s.area === area,
  );

  let best = areaSeeds.find((s) => s.subArea === salesPointName);
  if (best) return best;

  best = areaSeeds.find((s) => s.subArea.toLowerCase() === salesPointName.toLowerCase());
  if (best) return best;

  best = areaSeeds.find(
    (s) =>
      s.subArea.toLowerCase().includes(salesPointName.toLowerCase()) ||
      salesPointName.toLowerCase().includes(s.subArea.toLowerCase()),
  );
  if (best) return best;

  return areaSeeds[0] ?? null;
}

export const mockSalesPoints: SalesPointMapping[] = baseSalesPoints.map((salesPoint) => {
  const seed = findSeed(salesPoint.zone, salesPoint.region, salesPoint.area, salesPoint.salesPoint);

  return {
    ...salesPoint,
    subArea: seed?.subArea ?? salesPoint.salesPoint,
    pic1: seed?.pic1 ?? emptyPic,
    pic2: seed?.pic2 ?? emptyPic,
    remarks: seed?.remarks ?? "",
    note: seed?.note ?? "",
    shippingAddress: seed?.shippingAddress ?? emptyAddress,
    ...boundClient,
  };
});

export function getSalesPointPicByWcode(wcode: string): { name: string; email: string } {
  const salesPoint = mockSalesPoints.find((sp) => sp.wcode === wcode);
  return {
    name: salesPoint?.pic1?.name || "",
    email: salesPoint?.pic1?.email || "",
  };
}

export function getSalesPointClientBinding(salesPointId: string) {
  const salesPoint = mockSalesPoints.find((entry) => entry.wcode === salesPointId);

  if (!salesPoint) {
    return null;
  }

  return {
    clientId: salesPoint.clientId,
    clientName: salesPoint.clientName,
    clientEntityName: salesPoint.clientEntityName,
  };
}
