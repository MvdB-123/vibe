const AU_SLUGS: Record<string, string> = {
  AF:"asia/afghanistan",AL:"europe/albania",DZ:"africa/algeria",AO:"africa/angola",
  AR:"americas/argentina",AM:"europe/armenia",AT:"europe/austria",AZ:"europe/azerbaijan",
  BH:"middle-east/bahrain",BD:"asia/bangladesh",BB:"americas/barbados",BY:"europe/belarus",
  BE:"europe/belgium",BZ:"americas/belize",BJ:"africa/benin",BT:"asia/bhutan",
  BO:"americas/bolivia",BA:"europe/bosnia-and-herzegovina",BW:"africa/botswana",BR:"americas/brazil",
  BN:"asia/brunei",BG:"europe/bulgaria",BF:"africa/burkina-faso",BI:"africa/burundi",
  CV:"africa/cabo-verde",KH:"asia/cambodia",CM:"africa/cameroon",CF:"africa/central-african-republic",
  TD:"africa/chad",CL:"americas/chile",CN:"asia/china",CO:"americas/colombia",
  KM:"africa/comoros",CD:"africa/democratic-republic-of-the-congo",CG:"africa/republic-of-the-congo",
  CR:"americas/costa-rica",CI:"africa/cote-divoire",HR:"europe/croatia",CU:"americas/cuba",
  CY:"europe/cyprus",CZ:"europe/czech-republic",DK:"europe/denmark",DJ:"africa/djibouti",
  DM:"americas/dominica",DO:"americas/dominican-republic",EC:"americas/ecuador",
  EG:"middle-east/egypt",SV:"americas/el-salvador",GQ:"africa/equatorial-guinea",
  ER:"africa/eritrea",EE:"europe/estonia",SZ:"africa/eswatini",ET:"africa/ethiopia",
  FJ:"pacific/fiji",FI:"europe/finland",FR:"europe/france",GA:"africa/gabon",
  GM:"africa/gambia",GE:"europe/georgia",DE:"europe/germany",GH:"africa/ghana",
  GR:"europe/greece",GD:"americas/grenada",GT:"americas/guatemala",GN:"africa/guinea",
  GW:"africa/guinea-bissau",GY:"americas/guyana",HT:"americas/haiti",HN:"americas/honduras",
  HU:"europe/hungary",IS:"europe/iceland",IN:"asia/india",ID:"asia/indonesia",
  IR:"middle-east/iran",IQ:"middle-east/iraq",IE:"europe/ireland",IL:"middle-east/israel",
  IT:"europe/italy",JM:"americas/jamaica",JP:"asia/japan",JO:"middle-east/jordan",
  KZ:"asia/kazakhstan",KE:"africa/kenya",KI:"pacific/kiribati",KP:"asia/north-korea",
  KR:"asia/south-korea",XK:"europe/kosovo",KW:"middle-east/kuwait",KG:"asia/kyrgyzstan",
  LA:"asia/laos",LV:"europe/latvia",LB:"middle-east/lebanon",LS:"africa/lesotho",
  LR:"africa/liberia",LY:"middle-east/libya",LI:"europe/liechtenstein",LT:"europe/lithuania",
  LU:"europe/luxembourg",MG:"africa/madagascar",MW:"africa/malawi",MY:"asia/malaysia",
  MV:"asia/maldives",ML:"africa/mali",MT:"europe/malta",MH:"pacific/marshall-islands",
  MR:"africa/mauritania",MU:"africa/mauritius",MX:"americas/mexico",FM:"pacific/micronesia",
  MD:"europe/moldova",MC:"europe/monaco",MN:"asia/mongolia",ME:"europe/montenegro",
  MA:"africa/morocco",MZ:"africa/mozambique",MM:"asia/myanmar",NA:"africa/namibia",
  NR:"pacific/nauru",NP:"asia/nepal",NL:"europe/netherlands",NZ:"pacific/new-zealand",
  NI:"americas/nicaragua",NE:"africa/niger",NG:"africa/nigeria",MK:"europe/north-macedonia",
  NO:"europe/norway",OM:"middle-east/oman",PK:"asia/pakistan",PW:"pacific/palau",
  PS:"middle-east/palestinian-territories",PA:"americas/panama",PG:"pacific/papua-new-guinea",
  PY:"americas/paraguay",PE:"americas/peru",PH:"asia/philippines",PL:"europe/poland",
  PT:"europe/portugal",QA:"middle-east/qatar",RO:"europe/romania",RU:"europe/russia",
  RW:"africa/rwanda",KN:"americas/saint-kitts-and-nevis",LC:"americas/saint-lucia",
  VC:"americas/saint-vincent-and-the-grenadines",WS:"pacific/samoa",
  ST:"africa/sao-tome-and-principe",SA:"middle-east/saudi-arabia",SN:"africa/senegal",
  RS:"europe/serbia",SC:"africa/seychelles",SL:"africa/sierra-leone",SG:"asia/singapore",
  SK:"europe/slovakia",SI:"europe/slovenia",SB:"pacific/solomon-islands",SO:"africa/somalia",
  ZA:"africa/south-africa",SS:"africa/south-sudan",ES:"europe/spain",LK:"asia/sri-lanka",
  SD:"africa/sudan",SR:"americas/suriname",SE:"europe/sweden",CH:"europe/switzerland",
  SY:"middle-east/syria",TW:"asia/taiwan",TJ:"asia/tajikistan",TZ:"africa/tanzania",
  TH:"asia/thailand",TL:"asia/timor-leste",TG:"africa/togo",TO:"pacific/tonga",
  TT:"americas/trinidad-and-tobago",TN:"africa/tunisia",TR:"middle-east/turkiye",
  TM:"asia/turkmenistan",TV:"pacific/tuvalu",UG:"africa/uganda",UA:"europe/ukraine",
  AE:"middle-east/united-arab-emirates",GB:"europe/united-kingdom",
  US:"americas/united-states-of-america",UY:"americas/uruguay",UZ:"asia/uzbekistan",
  VU:"pacific/vanuatu",VE:"americas/venezuela",VN:"asia/vietnam",YE:"middle-east/yemen",
  ZM:"africa/zambia",ZW:"africa/zimbabwe",
};

const DK_SLUGS: Record<string, string> = {
  AF:"afghanistan",AL:"albanien",DZ:"algeriet",AO:"angola",AR:"argentina",
  AM:"armenien",AU:"australien",AZ:"azerbajdjan",BH:"bahrain",BD:"bangladesh",
  BE:"belgien",BY:"hviderusland",BZ:"belize",BJ:"benin",BT:"bhutan",BO:"bolivia",
  BA:"bosnien-hercegovina",BW:"botswana",BR:"brasilien",BN:"brunei",BG:"bulgarien",
  BF:"burkina-faso",BI:"burundi",KH:"cambodja",CM:"cameroun",CV:"kap-verde",
  CF:"centralafrikanske-republik",TD:"tchad",CL:"chile",CN:"kina",CO:"colombia",
  KM:"comorerne",CD:"congo-demokratiske-republik",CG:"congo",CR:"costa-rica",
  CI:"cote-divoire",HR:"kroatien",CU:"cuba",CY:"cypern",CZ:"tjekkiet",
  DJ:"djibouti",DO:"dominikanske-republik",EC:"ecuador",EG:"egypten",
  SV:"el-salvador",ER:"eritrea",EE:"estland",SZ:"eswatini",ET:"etiopien",
  FJ:"fiji",FI:"finland",FR:"frankrig",GA:"gabon",GE:"georgien",DE:"tyskland",
  GH:"ghana",GR:"graekenland",GT:"guatemala",GN:"guinea",GW:"guinea-bissau",
  GY:"guyana",HT:"haiti",HN:"honduras",HU:"ungarn",IN:"indien",ID:"indonesien",
  IQ:"irak",IR:"iran",IE:"irland",IL:"israel",IT:"italien",JM:"jamaica",
  JP:"japan",JO:"jordan",KZ:"kasakhstan",KE:"kenya",KG:"kirgisistan",KW:"kuwait",
  LA:"laos",LV:"letland",LB:"libanon",LR:"liberia",LY:"libyen",LT:"litauen",
  LU:"luxembourg",MG:"madagaskar",MW:"malawi",MY:"malaysia",MV:"maldiverne",
  ML:"mali",MT:"malta",MA:"marokko",MR:"mauretanien",MU:"mauritius",MX:"mexico",
  MD:"moldova",MN:"mongoliet",ME:"montenegro",MZ:"mozambique",MM:"myanmar",
  NA:"namibia",NP:"nepal",NZ:"new-zealand",NI:"nicaragua",NE:"niger",NG:"nigeria",
  KP:"nordkorea",MK:"nordmakedonien",NO:"norge",OM:"oman",PK:"pakistan",
  PA:"panama",PG:"papua-new-guinea",PY:"paraguay",PE:"peru",PH:"filippinerne",
  PL:"polen",PT:"portugal",QA:"qatar",RO:"roemien",RU:"rusland",RW:"rwanda",
  SA:"saudi-arabien",SN:"senegal",RS:"serbien",SL:"sierra-leone",SG:"singapore",
  SK:"slovakiet",SI:"slovenien",SO:"somalia",ZA:"sydafrika",KR:"sydkorea",
  SS:"sydsudan",ES:"spanien",LK:"sri-lanka",SD:"sudan",SR:"surinam",CH:"schweiz",
  SY:"syrien",TJ:"tadsjikistan",TW:"taiwan",TZ:"tanzania",TH:"thailand",
  TG:"togo",TT:"trinidad-og-tobago",TN:"tunesien",TM:"turkmenistan",TR:"tyrkiet",
  UG:"uganda",UA:"ukraine",AE:"de-forenede-arabiske-emirater",GB:"storbritannien",
  US:"usa",UY:"uruguay",UZ:"usbekistan",VE:"venezuela",VN:"vietnam",
  YE:"yemen",ZM:"zambia",ZW:"zimbabwe",
};

const SE_SLUGS: Record<string, string> = {
  AF:"afghanistan",AL:"albanien",DZ:"algeriet",AO:"angola",AR:"argentina",
  AM:"armenien",AU:"australien",AZ:"azerbajdzjan",BH:"bahrain",BD:"bangladesh",
  BE:"belgien",BZ:"belize",BJ:"benin",BT:"bhutan",BO:"bolivia",
  BA:"bosnien-hercegovina",BW:"botswana",BR:"brasilien",BN:"brunei",BG:"bulgarien",
  BF:"burkina-faso",BI:"burundi",KH:"cambodja",CM:"kamerun",CA:"kanada",
  CV:"kap-verde",CL:"chile",CN:"kina",CO:"colombia",CG:"kongo-brazzaville",
  CD:"kongo-kinshasa",CR:"costa-rica",CI:"elfenbenskusten",HR:"kroatien",
  CU:"cuba",CY:"cypern",CZ:"tjeckien",DJ:"djibouti",DO:"dominikanska-republiken",
  EC:"ecuador",EG:"egypten",SV:"el-salvador",ER:"eritrea",EE:"estland",
  ET:"etiopien",FJ:"fiji",FI:"finland",FR:"frankrike",GA:"gabon",GE:"georgien",
  GH:"ghana",GR:"grekland",GT:"guatemala",GN:"guinea",GW:"guinea-bissau",
  GY:"guyana",HT:"haiti",HN:"honduras",HU:"ungern",IN:"indien",ID:"indonesien",
  IQ:"irak",IR:"iran",IE:"irland",IL:"israel",IT:"italien",JM:"jamaica",
  JP:"japan",JO:"jordanien",KZ:"kazakstan",KE:"kenya",KG:"kirgizistan",
  KW:"kuwait",LA:"laos",LV:"lettland",LB:"libanon",LR:"liberia",LY:"libyen",
  LT:"litauen",LU:"luxemburg",MG:"madagaskar",MW:"malawi",MY:"malaysia",
  MV:"maldiverna",ML:"mali",MT:"malta",MA:"marocko",MR:"mauretanien",
  MU:"mauritius",MX:"mexiko",MD:"moldavien",MN:"mongoliet",ME:"montenegro",
  MZ:"moçambique",MM:"myanmar",NA:"namibia",NP:"nepal",NZ:"nya-zeeland",
  NI:"nicaragua",NE:"niger",NG:"nigeria",KP:"nordkorea",MK:"nordmakedonien",
  NO:"norge",OM:"oman",PK:"pakistan",PA:"panama",PG:"papua-nya-guinea",
  PY:"paraguay",PE:"peru",PH:"filippinerna",PL:"polen",PT:"portugal",
  QA:"qatar",RO:"rumänien",RU:"ryssland",RW:"rwanda",SA:"saudiarabien",
  SN:"senegal",RS:"serbien",SL:"sierra-leone",SG:"singapore",SK:"slovakiet",
  SI:"slovenien",SO:"somalia",ZA:"sydafrika",KR:"sydkorea",SS:"sydsudan",
  ES:"spanien",LK:"sri-lanka",SD:"sudan",SR:"surinam",CH:"schweiz",SY:"syrien",
  TJ:"tadsjikistan",TW:"taiwan",TZ:"tanzania",TH:"thailand",TG:"togo",
  TT:"trinidad-og-tobago",TN:"tunesien",TM:"turkmenistan",TR:"tyrkiet",
  UG:"uganda",UA:"ukraine",AE:"de-forenede-arabiske-emirater",US:"usa",
  UY:"uruguay",UZ:"usbekistan",VE:"venezuela",VN:"vietnam",YE:"yemen",
  ZM:"zambia",ZW:"zimbabwe",
};

export function getSourceCountryUrl(sourceId: string, iso2: string): string | null {
  switch (sourceId) {
    case "australia": {
      const slug = AU_SLUGS[iso2];
      return slug ? `https://www.smartraveller.gov.au/destinations/${slug}` : null;
    }
    case "denmark": {
      const slug = DK_SLUGS[iso2];
      return slug ? `https://um.dk/rejse-og-ophold/rejse-til-udlandet/rejsevejledninger/${slug}` : null;
    }
    case "sweden": {
      const slug = SE_SLUGS[iso2];
      return slug
        ? `https://www.swedenabroad.se/sv/om-utlandet-f%C3%B6r-svenska-medborgare/${encodeURIComponent(slug)}/reseinformation/ambassadens-reseinformation/`
        : null;
    }
    default:
      return null;
  }
}
