/**
 * UI strings in Finnish, Swedish and English.
 *
 * Only the interface is translated. The *data* labels — main class, chapter,
 * item, agency and account names — come through from the source register in
 * Finnish, and the site shows them as they are rather than machine-translating
 * public finance terms. The About section says so plainly.
 */
import type { Lang } from './lib/format';

export type { Lang };

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'fi', label: 'Suomi' },
  { id: 'sv', label: 'Svenska' },
  { id: 'en', label: 'English' },
];

export interface Strings {
  htmlTitle: string;
  brand: string;
  brandSub: string;
  heroTitle: (year: number) => string;
  heroLede: string;

  expenditure: string;
  revenue: string;
  revenueExclBorrowing: string;
  borrowing: string;
  balance: string;
  surplus: string;
  deficit: string;

  budgeted: string;
  originalBudget: string;
  supplementaryBudgets: string;
  budgetInForce: string;
  available: string;
  actual: string;
  execution: string;
  perResident: string;
  shareOfTotal: string;
  vsPreviousYear: string;
  changeVsPreviousYear: string;

  viewBudget: string;
  viewOrg: string;
  viewEconomic: string;
  viewBudgetHint: string;
  viewOrgHint: string;
  viewEconomicHint: string;
  viewEconomicNote: string;

  chartTreemap: string;
  chartList: string;
  chartTable: string;

  year: string;
  selectYear: string;
  search: string;
  searchPlaceholder: string;
  searchHintNav: string;
  searchHintOpen: string;
  searchEmpty: string;
  searchStart: string;

  breadcrumbRoot: string;
  back: string;
  close: string;
  theme: string;
  language: string;

  monthlyOutturn: string;
  cumulativeOutturn: string;
  multiYear: string;
  noTrend: string;
  children: (n: number) => string;
  subItems: (n: number) => string;
  showAllSubItems: (n: number) => string;
  openInMainView: string;
  noChildren: string;

  partialYearTitle: string;
  partialYear: (year: number, months: number) => string;
  overBudget: string;
  underBudget: string;
  ofBudget: string;

  downloadCsv: string;
  rawData: string;
  rawDataHint: string;

  aboutTitle: string;
  aboutData: string;
  aboutMethodTitle: string;
  aboutMethod: string;
  aboutNamesTitle: string;
  aboutNames: string;
  aboutBalanceTitle: string;
  aboutBalance: string;
  updated: (date: string) => string;
  licence: string;

  loadError: string;
  retry: string;
  loading: string;

  months: string[];
  monthsShort: string[];
  tableName: string;
}

const fi: Strings = {
  htmlTitle: 'Valtion budjetti',
  brand: 'Valtion budjetti',
  brandSub: 'talousarvio ja toteutuma',
  heroTitle: (year) => `Mihin valtion rahat menivät vuonna ${year}?`,
  heroLede:
    'Suomen valtion talousarvio ja sen toteutuma, suoraan Valtiokonttorin avoimesta datasta. Napauta mitä tahansa palkkia tai laatikkoa porautuaksesi pääluokasta lukuun ja aina yksittäiseen momenttiin asti.',

  expenditure: 'Menot',
  revenue: 'Tulot',
  revenueExclBorrowing: 'Tulot ilman lainanottoa',
  borrowing: 'Lainanotto',
  balance: 'Tasapaino',
  surplus: 'Ylijäämä',
  deficit: 'Alijäämä',

  budgeted: 'Budjetoitu',
  originalBudget: 'Alkuperäinen talousarvio',
  supplementaryBudgets: 'Lisätalousarviot',
  budgetInForce: 'Voimassaoleva talousarvio',
  available: 'Käytettävissä',
  actual: 'Toteutuma',
  execution: 'Toteutumisaste',
  perResident: 'Asukasta kohden',
  shareOfTotal: 'Osuus',
  vsPreviousYear: 'edellisvuodesta',
  changeVsPreviousYear: 'Muutos edellisvuodesta',

  viewBudget: 'Talousarvion rakenne',
  viewOrg: 'Hallinnonala',
  viewEconomic: 'Menolaji',
  viewBudgetHint: 'Pääluokka → luku → momentti',
  viewOrgHint: 'Hallinnonala → kirjanpitoyksikkö → momentti',
  viewEconomicHint: 'Tililuokka → tiliryhmä → tili',
  viewEconomicNote:
    'Määrärahoja ei jaotella lähdeaineistossa tilien mukaan, joten tässä näkymässä on vain toteutuma — ei vertailua budjettiin.',

  chartTreemap: 'Kartta',
  chartList: 'Lista',
  chartTable: 'Taulukko',

  year: 'Vuosi',
  selectYear: 'Valitse vuosi',
  search: 'Haku',
  searchPlaceholder: 'Etsi momenttia, lukua tai virastoa…',
  searchHintNav: 'siirry',
  searchHintOpen: 'avaa',
  searchEmpty: 'Ei osumia.',
  searchStart: 'Kirjoita vähintään kaksi merkkiä.',

  breadcrumbRoot: 'Kaikki',
  back: 'Takaisin',
  close: 'Sulje',
  theme: 'Vaihda teemaa',
  language: 'Kieli',

  monthlyOutturn: 'Toteutuma kuukausittain',
  cumulativeOutturn: 'Kertymä vuoden mittaan',
  multiYear: 'Kehitys vuosittain',
  noTrend: 'Vertailutietoa muilta vuosilta ei ole saatavilla.',
  children: (n) => (n === 1 ? '1 alakohta' : `${n} alakohtaa`),
  subItems: (n) => (n === 1 ? 'Sisältää 1 alakohdan' : `Sisältää ${n} alakohtaa`),
  showAllSubItems: (n) => `Näytä kaikki ${n} alakohtaa`,
  openInMainView: 'Avaa listaan',
  noChildren: 'Tämä on hierarkian alin taso.',

  partialYearTitle: 'Vuosi on kesken',
  partialYear: (year, months) =>
    `Vuodelta ${year} on kirjattu kuukaudet 1–${months}. Toteutuma karttuu vielä, joten sitä ei voi verrata koko vuoden budjettiin.`,
  overBudget: 'yli budjetin',
  underBudget: 'alle budjetin',
  ofBudget: 'budjetista käytetty',

  downloadCsv: 'Lataa CSV',
  rawData: 'Avaa lähdeaineisto',
  rawDataHint: 'Sama rajaus suoraan Valtiokonttorin rajapinnasta.',

  aboutTitle: 'Tietoja aineistosta',
  aboutData:
    'Luvut ovat Valtiokonttorin ylläpitämästä Tutkihallintoa.fi-palvelun avoimesta rajapinnasta, aineistosta "Budjettitalouden tapahtumat". Sivusto päivitetään käsin kerran vuodessa.',
  aboutMethodTitle: 'Miten luvut on laskettu',
  aboutMethod:
    'Rajapinta palauttaa jokaisen kuukauden liikkeet erikseen, joten vuosiluvut ovat kuukausien summia. Alkuperäinen talousarvio kirjautuu tammikuulle ja jokainen lisätalousarvio sille kuukaudelle, jona se hyväksyttiin. Tulot kirjataan valtion kirjanpidossa miinusmerkkisinä; tällä sivustolla ne näytetään positiivisina ja suunta kerrotaan otsikossa.',
  aboutNamesTitle: 'Nimet ja kielet',
  aboutNames:
    'Momenttien, lukujen ja pääluokkien nimet tulevat sellaisinaan lähdeaineistosta ja ovat saatavilla vain suomeksi. Lähde katkaisee ne 60 merkkiin. Vuodesta 2025 alkaen nimet ovat aineistossa versaalilla; ne on palautettu normaaliin kirjoitusasuun.',
  aboutBalanceTitle: 'Tasapaino ja lainanotto',
  aboutBalance:
    'Talousarvio on aina paperilla tasapainossa, koska lainanotto (osasto 15) budjetoidaan kattamaan erotus. Siksi lainanotto on tällä sivustolla erotettu muista tuloista ja tasapaino lasketaan ilman sitä.',
  updated: (date) => `Aineisto haettu ${date}`,
  licence: 'Lähdeaineisto CC BY 4.0',

  loadError: 'Tietojen lataaminen ei onnistunut.',
  retry: 'Yritä uudelleen',
  loading: 'Ladataan…',

  months: [
    'tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu',
    'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu',
  ],
  monthsShort: ['T', 'H', 'M', 'H', 'T', 'K', 'H', 'E', 'S', 'L', 'M', 'J'],
  tableName: 'Kohde',
};

const sv: Strings = {
  ...fi,
  htmlTitle: 'Statsbudgeten',
  brand: 'Statsbudgeten',
  brandSub: 'budget och utfall',
  heroTitle: (year) => `Vart gick statens pengar år ${year}?`,
  heroLede:
    'Finlands statsbudget och dess utfall, direkt från Statskontorets öppna data. Tryck på vilken stapel eller ruta som helst för att borra dig från huvudtitel till kapitel och ända ner till ett enskilt moment.',

  expenditure: 'Utgifter',
  revenue: 'Inkomster',
  revenueExclBorrowing: 'Inkomster utan upplåning',
  borrowing: 'Upplåning',
  balance: 'Balans',
  surplus: 'Överskott',
  deficit: 'Underskott',

  budgeted: 'Budgeterat',
  originalBudget: 'Ordinarie budget',
  supplementaryBudgets: 'Tilläggsbudgetar',
  budgetInForce: 'Gällande budget',
  available: 'Disponibelt',
  actual: 'Utfall',
  execution: 'Utfallsgrad',
  perResident: 'Per invånare',
  shareOfTotal: 'Andel',
  vsPreviousYear: 'från föregående år',
  changeVsPreviousYear: 'Förändring från föregående år',

  viewBudget: 'Budgetens struktur',
  viewOrg: 'Förvaltningsområde',
  viewEconomic: 'Utgiftsslag',
  viewBudgetHint: 'Huvudtitel → kapitel → moment',
  viewOrgHint: 'Förvaltningsområde → bokföringsenhet → moment',
  viewEconomicHint: 'Kontoklass → kontogrupp → konto',
  viewEconomicNote:
    'Anslagen fördelas inte på konton i källmaterialet, så den här vyn visar bara utfallet — ingen jämförelse med budgeten.',

  chartTreemap: 'Karta',
  chartList: 'Lista',
  chartTable: 'Tabell',

  year: 'År',
  selectYear: 'Välj år',
  search: 'Sök',
  searchPlaceholder: 'Sök moment, kapitel eller ämbetsverk…',
  searchHintNav: 'flytta',
  searchHintOpen: 'öppna',
  searchEmpty: 'Inga träffar.',
  searchStart: 'Skriv minst två tecken.',

  breadcrumbRoot: 'Alla',
  back: 'Tillbaka',
  close: 'Stäng',
  theme: 'Byt tema',
  language: 'Språk',

  monthlyOutturn: 'Utfall per månad',
  cumulativeOutturn: 'Ackumulerat under året',
  multiYear: 'Utveckling per år',
  noTrend: 'Jämförelseuppgifter från andra år saknas.',
  children: (n) => (n === 1 ? '1 underpost' : `${n} underposter`),
  subItems: (n) => (n === 1 ? 'Innehåller 1 underpost' : `Innehåller ${n} underposter`),
  showAllSubItems: (n) => `Visa alla ${n} underposter`,
  openInMainView: 'Öppna i listan',
  noChildren: 'Detta är hierarkins lägsta nivå.',

  partialYearTitle: 'Året pågår',
  partialYear: (year, months) =>
    `För ${year} har månaderna 1–${months} bokförts. Utfallet växer ännu och kan inte jämföras med hela årets budget.`,
  overBudget: 'över budget',
  underBudget: 'under budget',
  ofBudget: 'av budgeten använt',

  downloadCsv: 'Ladda ner CSV',
  rawData: 'Öppna källdata',
  rawDataHint: 'Samma avgränsning direkt från Statskontorets gränssnitt.',

  aboutTitle: 'Om materialet',
  aboutData:
    'Siffrorna kommer från Statskontorets öppna gränssnitt i tjänsten Tutkihallintoa.fi, materialet "Budjettitalouden tapahtumat". Webbplatsen uppdateras manuellt en gång om året.',
  aboutMethodTitle: 'Så har siffrorna räknats',
  aboutMethod:
    'Gränssnittet returnerar varje månads rörelser separat, så årssiffrorna är summor av månaderna. Den ordinarie budgeten bokförs på januari och varje tilläggsbudget på den månad då den godkändes. Inkomster bokförs med minustecken i statens bokföring; här visas de som positiva och riktningen framgår av rubriken.',
  aboutNamesTitle: 'Namn och språk',
  aboutNames:
    'Namnen på moment, kapitel och huvudtitlar kommer som de är från källmaterialet och finns endast på finska. Källan klipper dem vid 60 tecken. Från och med 2025 är namnen versaler i materialet; de har återställts till normal skrivform.',
  aboutBalanceTitle: 'Balans och upplåning',
  aboutBalance:
    'Budgeten är alltid i balans på pappret, eftersom upplåningen (avdelning 15) budgeteras för att täcka skillnaden. Därför har upplåningen skilts från övriga inkomster här och balansen räknas utan den.',
  updated: (date) => `Materialet hämtat ${date}`,
  licence: 'Källmaterial CC BY 4.0',

  loadError: 'Uppgifterna kunde inte laddas.',
  retry: 'Försök igen',
  loading: 'Laddar…',

  months: [
    'januari', 'februari', 'mars', 'april', 'maj', 'juni',
    'juli', 'augusti', 'september', 'oktober', 'november', 'december',
  ],
  monthsShort: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
  tableName: 'Post',
};

const en: Strings = {
  ...fi,
  htmlTitle: 'The Finnish state budget',
  brand: 'Finnish state budget',
  brandSub: 'budget and outturn',
  heroTitle: (year) => `Where did the state's money go in ${year}?`,
  heroLede:
    "Finland's central government budget and what was actually spent, straight from the State Treasury's open data. Tap any bar or box to drill from a main class down to a chapter and on to a single budget item.",

  expenditure: 'Expenditure',
  revenue: 'Revenue',
  revenueExclBorrowing: 'Revenue excl. borrowing',
  borrowing: 'Borrowing',
  balance: 'Balance',
  surplus: 'Surplus',
  deficit: 'Deficit',

  budgeted: 'Budgeted',
  originalBudget: 'Original budget',
  supplementaryBudgets: 'Supplementary budgets',
  budgetInForce: 'Budget in force',
  available: 'Available',
  actual: 'Outturn',
  execution: 'Execution',
  perResident: 'Per resident',
  shareOfTotal: 'Share',
  vsPreviousYear: 'vs previous year',
  changeVsPreviousYear: 'Change vs previous year',

  viewBudget: 'Budget structure',
  viewOrg: 'Ministry',
  viewEconomic: 'Type of spending',
  viewBudgetHint: 'Main class → chapter → item',
  viewOrgHint: 'Ministry branch → agency → item',
  viewEconomicHint: 'Account class → group → account',
  viewEconomicNote:
    'Appropriations are not broken down by account in the source data, so this view shows the outturn only — there is nothing to compare it with.',

  chartTreemap: 'Map',
  chartList: 'List',
  chartTable: 'Table',

  year: 'Year',
  selectYear: 'Select year',
  search: 'Search',
  searchPlaceholder: 'Search an item, chapter or agency…',
  searchHintNav: 'navigate',
  searchHintOpen: 'open',
  searchEmpty: 'No matches.',
  searchStart: 'Type at least two characters.',

  breadcrumbRoot: 'All',
  back: 'Back',
  close: 'Close',
  theme: 'Switch theme',
  language: 'Language',

  monthlyOutturn: 'Outturn by month',
  cumulativeOutturn: 'Accumulated over the year',
  multiYear: 'Year by year',
  noTrend: 'No comparable figures from other years.',
  children: (n) => (n === 1 ? '1 sub-item' : `${n} sub-items`),
  subItems: (n) => (n === 1 ? 'Contains 1 sub-item' : `Contains ${n} sub-items`),
  showAllSubItems: (n) => `Show all ${n} sub-items`,
  openInMainView: 'Open in the list',
  noChildren: 'This is the lowest level of the hierarchy.',

  partialYearTitle: 'Year in progress',
  partialYear: (year, months) =>
    `${year} has months 1–${months} booked so far. The outturn is still accumulating, so it cannot be compared with a full year's budget.`,
  overBudget: 'over budget',
  underBudget: 'under budget',
  ofBudget: 'of budget used',

  downloadCsv: 'Download CSV',
  rawData: 'Open the source data',
  rawDataHint: 'The same slice straight from the State Treasury API.',

  aboutTitle: 'About the data',
  aboutData:
    'Figures come from the State Treasury’s open API on Tutkihallintoa.fi, dataset "Budjettitalouden tapahtumat" (central government budget transactions). This site is rebuilt by hand once a year.',
  aboutMethodTitle: 'How the figures are derived',
  aboutMethod:
    'The API returns each month’s movements separately, so annual figures are sums over the months. The original appropriation lands in January and each supplementary budget in the month it was passed. Revenue is credited — that is, negative — in state bookkeeping; here it is shown as a positive amount and the direction is stated in the heading.',
  aboutNamesTitle: 'Names and languages',
  aboutNames:
    'Item, chapter and main class names come through unchanged from the source register and exist in Finnish only. The source truncates them at 60 characters. From 2025 the source switched them to capitals; they have been restored to sentence case.',
  aboutBalanceTitle: 'Balance and borrowing',
  aboutBalance:
    'The budget always balances on paper, because borrowing (revenue department 15) is budgeted to cover the difference. Borrowing is therefore separated from other revenue here, and the balance is calculated without it.',
  updated: (date) => `Data retrieved ${date}`,
  licence: 'Source data CC BY 4.0',

  loadError: 'The data could not be loaded.',
  retry: 'Try again',
  loading: 'Loading…',

  months: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  monthsShort: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
  tableName: 'Item',
};

export const STRINGS: Record<Lang, Strings> = { fi, sv, en };

export function stringsFor(lang: Lang): Strings {
  return STRINGS[lang] ?? STRINGS.fi;
}
