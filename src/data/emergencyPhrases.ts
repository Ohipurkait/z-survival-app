export type IndicLanguageCode =
  | 'hi'
  | 'bn'
  | 'ta'
  | 'te'
  | 'mr'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'pa'
  | 'or'
  | 'as';

export type LanguageCode = 'en' | IndicLanguageCode;

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  nllbCode: string; // FLORES-200 code for Xenova/nllb-200-distilled-600M
  speechCode: string; // BCP-47 voice tag for window.speechSynthesis
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    nllbCode: 'eng_Latn',
    speechCode: 'en-IN',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    nllbCode: 'hin_Deva',
    speechCode: 'hi-IN',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    nllbCode: 'ben_Beng',
    speechCode: 'bn-IN',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    nllbCode: 'tam_Taml',
    speechCode: 'ta-IN',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    nllbCode: 'tel_Telu',
    speechCode: 'te-IN',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    nllbCode: 'mar_Deva',
    speechCode: 'mr-IN',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    nllbCode: 'guj_Gujr',
    speechCode: 'gu-IN',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    nllbCode: 'kan_Knda',
    speechCode: 'kn-IN',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    nllbCode: 'mal_Mlym',
    speechCode: 'ml-IN',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    nllbCode: 'pan_Guru',
    speechCode: 'pa-IN',
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    nllbCode: 'ory_Orya',
    speechCode: 'or-IN',
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    nllbCode: 'asm_Beng',
    speechCode: 'as-IN',
  },
];

export const INDIC_LANGUAGES: LanguageMeta[] = SUPPORTED_LANGUAGES.filter(
  (l): l is LanguageMeta & { code: IndicLanguageCode } => l.code !== 'en'
);

export const LANGUAGE_BY_CODE: Record<LanguageCode, LanguageMeta> =
  SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => {
      acc[lang.code] = lang;
      return acc;
    },
    {} as Record<LanguageCode, LanguageMeta>
  );

export type PhraseCategory = 'medical' | 'water-food' | 'danger-shelter';

export interface TranslatedPhraseEntry {
  native: string;
  roman: string;
}

export interface EmergencyPhrase {
  id: string;
  category: PhraseCategory;
  urgent?: boolean;
  en: string;
  translations: Record<IndicLanguageCode, TranslatedPhraseEntry>;
}

export const EMERGENCY_PHRASES: EmergencyPhrase[] = [
  {
    id: 'need-water',
    category: 'water-food',
    urgent: true,
    en: 'We need clean drinking water immediately.',
    translations: {
      hi: {
        native: 'हमें तुरंत पीने का साफ पानी चाहिए।',
        roman: 'Hamein turant peene ka saaf paani chahiye.',
      },
      bn: {
        native: 'আমাদের এখনই পরিষ্কার পানীয় জল দরকার।',
        roman: 'Amader ekhoni porishkar paniyo jol dorkar.',
      },
      ta: {
        native: 'எங்களுக்கு உடனடியாக சுத்தமான குடிநீர் வேண்டும்.',
        roman: 'Engalukku udanadiyaga sutthamana kudineer vendum.',
      },
      te: {
        native: 'మాకు వెంటనే శుభ్రమైన తాగునీరు కావాలి.',
        roman: 'Maaku ventane shubhramaina taaguneeru kaavaali.',
      },
      mr: {
        native: 'आम्हाला तात्काळ पिण्याचे स्वच्छ पाणी हवे आहे.',
        roman: 'Aamhala tatkal pinyache swachha paani have aahe.',
      },
      gu: {
        native: 'અમને તાત્કાલિક પીવાનું ચોખ્ખું પાણી જોઈએ છે.',
        roman: 'Amne tatkalik peevanu chokhhu paani joiye chhe.',
      },
      kn: {
        native: 'ನಮಗೆ ತಕ್ಷಣ ಕುಡಿಯುವ ಶುದ್ಧ ನೀರು ಬೇಕು.',
        roman: 'Namage takshana kudiyuva shuddha neeru beku.',
      },
      ml: {
        native: 'ഞങ്ങൾക്ക് ഉടൻ ശുദ്ധമായ കുടിവെള്ളം വേണം.',
        roman: 'Njangalkku udan shuddhamaya kudivellam venam.',
      },
      pa: {
        native: 'ਸਾਨੂੰ ਤੁਰੰਤ ਪੀਣ ਲਈ ਸਾਫ਼ ਪਾਣੀ ਚਾਹੀਦਾ ਹੈ।',
        roman: 'Saanu turant peen layi saaf paani chahida hai.',
      },
      or: {
        native: 'ଆମକୁ ତୁରନ୍ତ ପିଇବା ପାଇଁ ସଫା ପାଣି ଦରକାର।',
        roman: 'Amaku turanta peeba pain sapha paani darakar.',
      },
      as: {
        native: 'আমাক তৎক্ষণাত খোৱাৰ বাবে পৰিষ্কাৰ পানী লাগে।',
        roman: 'Amak totkhonat khowar babe poriskar paani lage.',
      },
    },
  },
  {
    id: 'someone-injured',
    category: 'medical',
    urgent: true,
    en: 'Someone is badly injured. We need medical help.',
    translations: {
      hi: {
        native: 'कोई गंभीर रूप से घायल है। हमें मेडिकल मदद चाहिए।',
        roman: 'Koi gambheer roop se ghayal hai. Hamein medical madad chahiye.',
      },
      bn: {
        native: 'একজন গুরুতর আহত। আমাদের চিকিৎসার সাহায্য দরকার।',
        roman: 'Ekjon gurutoro ahoto. Amader chikitshar sahajyo dorkar.',
      },
      ta: {
        native: 'ஒருவர் பலமாக காயமடைந்துள்ளார். மருத்துவ உதவி வேண்டும்.',
        roman: 'Oruvar balamaga kaayam adainthullar. Maruthuva udhavi vendum.',
      },
      te: {
        native: 'ఒకరు తీవ్రంగా గాయపడ్డారు. మాకు వైద్య సహాయం కావాలి.',
        roman: 'Okaru teevranga gaayapaddaru. Maaku vaidya sahaayam kaavaali.',
      },
      mr: {
        native: 'एक जण गंभीर जखमी आहे. आम्हाला वैद्यकीय मदत हवी आहे.',
        roman: 'Ek jan gambhir jakhmi aahe. Aamhala vaidyakiya madat havi aahe.',
      },
      gu: {
        native: 'કોઈ ગંભીર રીતે ઘાયલ છે. અમને તબીબી મદદ જોઈએ છે.',
        roman: 'Koi gambhir rite ghayal chhe. Amne tabibi madad joiye chhe.',
      },
      kn: {
        native: 'ಒಬ್ಬರು ತೀವ್ರವಾಗಿ ಗಾಯಗೊಂಡಿದ್ದಾರೆ. ನಮಗೆ ವೈದ್ಯಕೀಯ ಸಹಾಯ ಬೇಕು.',
        roman: 'Obbaru teevravagi gaayagondiddare. Namage vaidyakeeya sahaaya beku.',
      },
      ml: {
        native: 'ഒരാൾക്ക് ഗുരുതരമായി പരിക്കേറ്റു. വൈദ്യസഹായം വേണം.',
        roman: 'Oraalkku gurutharamayi parikketu. Vaidyasahaayam venam.',
      },
      pa: {
        native: 'ਕੋਈ ਗੰਭੀਰ ਜ਼ਖ਼ਮੀ ਹੈ। ਸਾਨੂੰ ਡਾਕਟਰੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ।',
        roman: 'Koi gambheer zakhmi hai. Saanu doctori madad chahidi hai.',
      },
      or: {
        native: 'ଜଣେ ଗୁରୁତର ଆହତ ହୋଇଛନ୍ତି। ଆମକୁ ଚିକିତ୍ସା ସହାୟତା ଦରକାର।',
        roman: 'Jane gurutara ahata hoichanti. Amaku chikitsa sahayata darakar.',
      },
      as: {
        native: 'এজন গুৰুতৰভাৱে আহত হৈছে। আমাক চিকিৎসাৰ সহায় লাগে।',
        roman: 'Ejon gurutrobhabe ahoto hoise. Amak chikitsar hohay lage.',
      },
    },
  },
  {
    id: 'safe-shelter',
    category: 'danger-shelter',
    en: 'Is there a safe shelter or bunker nearby?',
    translations: {
      hi: {
        native: 'क्या पास में कोई सुरक्षित आश्रय या बंकर है?',
        roman: 'Kya paas mein koi surakshit aashray ya bunker hai?',
      },
      bn: {
        native: 'কাছে কোথাও কি নিরাপদ আশ্রয় বা বাঙ্কার আছে?',
        roman: 'Kachhe kothao ki nirapod ashroy ba bunker achhe?',
      },
      ta: {
        native: 'அருகில் பாதுகாப்பான தங்குமிடம் உள்ளதா?',
        roman: 'Arugil paadhugaappana thangumidam ulladha?',
      },
      te: {
        native: 'దగ్గరలో సురక్షితమైన ఆశ్రయం ఏదైనా ఉందా?',
        roman: 'Daggaralo surakshitamaina aashrayam edaina unda?',
      },
      mr: {
        native: 'जवळपास सुरक्षित निवारा किंवा बंकर आहे का?',
        roman: 'Javalpaas surakshit nivara kinva bunker aahe ka?',
      },
      gu: {
        native: 'શું નજીકમાં કોઈ સુરક્ષિત આશ્રયસ્થાન છે?',
        roman: 'Shu najikma koi surakshit aashraysthan chhe?',
      },
      kn: {
        native: 'ಹತ್ತಿರದಲ್ಲಿ ಸುರಕ್ಷಿತ ಆಶ್ರಯ ಸ್ಥಳ ಇದೆಯೇ?',
        roman: 'Hattiradalli surakshita aashraya sthala ideye?',
      },
      ml: {
        native: 'അടുത്ത് എവിടെയെങ്കിലും സുരക്ഷിതമായ അഭയകേന്ദ്രമുണ്ടോ?',
        roman: 'Aduthu evideyengilum surakshitamaya abhayakendramundo?',
      },
      pa: {
        native: 'ਕੀ ਨੇੜੇ ਕੋਈ ਸੁਰੱਖਿਅਤ ਆਸਰਾ ਜਾਂ ਬੰਕਰ ਹੈ?',
        roman: 'Ki nede koi surakhiat aasra jaan bunker hai?',
      },
      or: {
        native: 'ପାଖରେ କୌଣସି ସୁରକ୍ଷିତ ଆଶ୍ରୟସ୍ଥଳୀ ଅଛି କି?',
        roman: 'Pakhare kaunasi surakshita ashrayasthali achhi ki?',
      },
      as: {
        native: 'ওচৰত কোনো সুৰক্ষিত আশ্ৰয়স্থল আছে নেকি?',
        roman: 'Osorot kono hurokhito ashroysthol ase neki?',
      },
    },
  },
  {
    id: 'danger-quiet',
    category: 'danger-shelter',
    urgent: true,
    en: 'Danger ahead! Stay quiet and move back.',
    translations: {
      hi: {
        native: 'आगे खतरा है! शांत रहें और पीछे हटें।',
        roman: 'Aage khatra hai! Shaant rahein aur peeche hatein.',
      },
      bn: {
        native: 'সামনে বিপদ! চুপ থাকুন এবং পিছিয়ে যান।',
        roman: 'Shamne bipod! Chup thakun ebong pichhiye jaan.',
      },
      ta: {
        native: 'முன்னால் ஆபத்து! அமைதியாக இருங்கள், பின்னால் செல்லுங்கள்.',
        roman: 'Munnal aabathu! Amaithiyaga irungal, pinnal sellungal.',
      },
      te: {
        native: 'ముందు ప్రమాదం ఉంది! నిశ్శబ్దంగా ఉండి వెనక్కి వెళ్ళండి.',
        roman: 'Mundu pramaadam undi! Nishabdanga undi venakki vellandi.',
      },
      mr: {
        native: 'पुढे धोका आहे! शांत राहा आणि मागे हटा.',
        roman: 'Pudhe dhoka aahe! Shaant raha aani maage hata.',
      },
      gu: {
        native: 'આગળ ખતરો છે! શાંત રહો અને પાછા હટો.',
        roman: 'Aagal khatro chhe! Shaant raho ane paachha hato.',
      },
      kn: {
        native: 'ಮುಂದೆ ಅಪಾಯವಿದೆ! ನಿಶ್ಶಬ್ದವಾಗಿರಿ ಮತ್ತು ಹಿಂದೆ ಸರಿಯಿರಿ.',
        roman: 'Munde apaayavide! Nishabdavagiri mattu hinde sariyiri.',
      },
      ml: {
        native: 'മുന്നിൽ അപകടമുണ്ട്! നിശബ്ദരായി പുറകോട്ട് മാറുക.',
        roman: 'Munnil apakadamundu! Nishabdarayi purakottu maaruka.',
      },
      pa: {
        native: 'ਅੱਗੇ ਖ਼ਤਰਾ ਹੈ! ਚੁੱਪ ਰਹੋ ਅਤੇ ਪਿੱਛੇ ਹਟੋ।',
        roman: 'Agge khatra hai! Chupp raho ate pichhe hato.',
      },
      or: {
        native: 'ଆଗରେ ବିପଦ ଅଛି! ଚୁପ୍ ରୁହନ୍ତୁ ଏବଂ ପଛକୁ ଘୁଞ୍ଚନ୍ତୁ।',
        roman: 'Agare bipada achhi! Chup ruhantu ebam pachhaku ghunchantu.',
      },
      as: {
        native: 'আগত বিপদ আছে! মনে মনে থাকক আৰু পিছুৱাই যাওক।',
        roman: 'Agot bipod ase! Mone mone thakok aru pisuai jaok.',
      },
    },
  },
  {
    id: 'unarmed-friendly',
    category: 'danger-shelter',
    urgent: true,
    en: 'Do not shoot! We are unarmed survivors.',
    translations: {
      hi: {
        native: 'गोली मत चलाओ! हम निहत्थे बचे हुए लोग हैं।',
        roman: 'Goli mat chalao! Hum nihatthe bache hue log hain.',
      },
      bn: {
        native: 'গুলি চালাবেন না! আমরা নিরস্ত্র সাধারণ মানুষ।',
        roman: 'Guli chalaben na! Amra nirostro sadharon manush.',
      },
      ta: {
        native: 'சுடாதீர்கள்! எங்களிடம் ஆயுதம் இல்லை.',
        roman: 'Sudaadheergal! Engalidam aayudham illai.',
      },
      te: {
        native: 'కాల్చవద్దు! మా వద్ద ఆయుధాలు లేవు.',
        roman: 'Kaalchavaddu! Maa vadda aayudhaalu levu.',
      },
      mr: {
        native: 'गोळीबार करू नका! आम्ही निशस्त्र आहोत.',
        roman: 'Golibaar karu naka! Aamhi nishastra aahot.',
      },
      gu: {
        native: 'ગોળી ન ચલાવશો! અમે નિઃશસ્ત્ર છીએ.',
        roman: 'Goli na chalavsho! Ame nihshastra chhiye.',
      },
      kn: {
        native: 'ಗುಂಡು ಹಾರಿಸಬೇಡಿ! ನಮ್ಮ ಬಳಿ ಆಯುಧಗಳಿಲ್ಲ.',
        roman: 'Gundu haarisabedi! Namma bali aayudhagalilla.',
      },
      ml: {
        native: 'വെടിവയ്ക്കരുത്! ഞങ്ങളുടെ കൈയിൽ ആയുധമില്ല.',
        roman: 'Vedivaykkaruthu! Njangalude kayyil aayudhamilla.',
      },
      pa: {
        native: 'ਗੋਲੀ ਨਾ ਚਲਾਓ! ਅਸੀਂ ਨਿਹੱਥੇ ਲੋਕ ਹਾਂ।',
        roman: 'Goli na chalao! Asin nihatthe lok haan.',
      },
      or: {
        native: 'ଗୁଳି ଚଳାନ୍ତୁ ନାହିଁ! ଆମେ ନିରସ୍ତ୍ର ଅଟୁ।',
        roman: 'Guli chalantu nahin! Ame nirastra atu.',
      },
      as: {
        native: 'গুলী নকৰিব! আমাৰ হাতত কোনো অস্ত্ৰ নাই।',
        roman: 'Guli nokoribo! Amar hatot kono ostro nai.',
      },
    },
  },
  {
    id: 'water-contaminated',
    category: 'water-food',
    urgent: true,
    en: 'Do not drink! This water is contaminated.',
    translations: {
      hi: {
        native: 'मत पियो! यह पानी दूषित है।',
        roman: 'Mat piyo! Yeh paani dooshit hai.',
      },
      bn: {
        native: 'খাবেন না! এই জল দূষিত।',
        roman: 'Khaben na! Ei jol dushito.',
      },
      ta: {
        native: 'குடிக்காதீர்கள்! இந்த தண்ணீர் மாசுபட்டுள்ளது.',
        roman: 'Kudikkaadheergal! Indha thanneer maasupattulladhu.',
      },
      te: {
        native: 'తాగవద్దు! ఈ నీరు కలుషితమైనది.',
        roman: 'Taagavaddu! Ee neeru kalushitamainadi.',
      },
      mr: {
        native: 'पिऊ नका! हे पाणी दूषित आहे.',
        roman: 'Piu naka! He paani dooshit aahe.',
      },
      gu: {
        native: 'પીશો નહીં! આ પાણી દૂષિત છે.',
        roman: 'Peesho nahin! Aa paani dooshit chhe.',
      },
      kn: {
        native: 'ಕುಡಿಯಬೇಡಿ! ಈ ನೀರು ಕಲುಷಿತವಾಗಿದೆ.',
        roman: 'Kudiyabedi! Ee neeru kalushitavaagide.',
      },
      ml: {
        native: 'കുടിക്കരുത്! ഈ വെള്ളം മലിനമാണ്.',
        roman: 'Kudikkaruthu! Ee vellam malinamaanu.',
      },
      pa: {
        native: 'ਨਾ ਪੀਓ! ਇਹ ਪਾਣੀ ਦੂਸ਼ਿਤ ਹੈ।',
        roman: 'Na piyo! Eh paani dooshit hai.',
      },
      or: {
        native: 'ପିଅନ୍ତୁ ନାହିଁ! ଏହି ପାଣି ଦୂଷିତ ଅଟେ।',
        roman: 'Piantu nahin! Ehi paani dushita ate.',
      },
      as: {
        native: 'নাখাব! এই পানী দূষিত।',
        roman: 'Nakhabo! Ei paani duxito.',
      },
    },
  },
  {
    id: 'stop-bleeding',
    category: 'medical',
    urgent: true,
    en: 'Press hard on the wound to stop the bleeding.',
    translations: {
      hi: {
        native: 'खून रोकने के लिए घाव को जोर से दबाएं।',
        roman: 'Khoon rokne ke liye ghaav ko zor se dabayein.',
      },
      bn: {
        native: 'রক্তপাত বন্ধ করতে ক্ষতস্থানে জোরে চাপ দিন।',
        roman: 'Roktopat bondho korte khotosthane jore chaap din.',
      },
      ta: {
        native: 'ரத்தப்போக்கை நிறுத்த காயத்தை அழுத்திப் பிடியுங்கள்.',
        roman: 'Rathappokkai nirutha kaayathai azhuthi pidiyungal.',
      },
      te: {
        native: 'రక్తస్రావం ఆపడానికి గాయాన్ని గట్టిగా నొక్కండి.',
        roman: 'Raktasraavam aapadaaniki gaayaanni gattiga nokkandi.',
      },
      mr: {
        native: 'रक्तस्राव थांबवण्यासाठी जखम घट्ट दाबून धरा.',
        roman: 'Raktasraav thambavnyasathi jakham ghatta daabun dhara.',
      },
      gu: {
        native: 'લોહી રોકવા માટે ઘા પર જોરથી દબાવો.',
        roman: 'Lohi rokva mate ghaa par jorthi dabavo.',
      },
      kn: {
        native: 'ರಕ್ತಸ್ರಾವ ನಿಲ್ಲಿಸಲು ಗಾಯವನ್ನು ಗಟ್ಟಿಯಾಗಿ ಒತ್ತಿ ಹಿಡಿಯಿರಿ.',
        roman: 'Raktasraava nillisalu gaayavannu gattiyagi otti hidiyiri.',
      },
      ml: {
        native: 'രക്തസ്രാവം നിർത്താൻ മുറിവിൽ അമർത്തിപ്പിടിക്കുക.',
        roman: 'Raktasraavam nirthaan murivil amarthippidikkuka.',
      },
      pa: {
        native: 'ਖ਼ੂਨ ਰੋਕਣ ਲਈ ਜ਼ਖ਼ਮ ਨੂੰ ਜ਼ੋਰ ਨਾਲ ਦਬਾਓ।',
        roman: 'Khoon rokan layi zakham nu zor naal dabao.',
      },
      or: {
        native: 'ରକ୍ତସ୍ରାବ ବନ୍ଦ କରିବାକୁ ଘା’କୁ ଜୋରରେ ଚାପି ଧରନ୍ତୁ।',
        roman: 'Raktasraba banda karibaku ghaku jorare chapi dharantu.',
      },
      as: {
        native: 'তেজ বন্ধ কৰিবলৈ ঘাঁ টুকুৰাত জোৰেৰে হেঁচি ধৰক।',
        roman: 'Tej bondho koriboloi gha tukurat jorere hesi dhorok.',
      },
    },
  },
  {
    id: 'need-medicine',
    category: 'medical',
    en: 'Do you have antibiotics, bandages, or antiseptic?',
    translations: {
      hi: {
        native: 'क्या आपके पास एंटीबायोटिक, पट्टी या एंटीसेप्टिक है?',
        roman: 'Kya aapke paas antibiotic, patti ya antiseptic hai?',
      },
      bn: {
        native: 'আপনার কাছে কি ওষুধ, ব্যান্ডেজ বা অ্যান্টিসেপটিক আছে?',
        roman: 'Apnar kachhe ki oshudh, bandage ba antiseptic achhe?',
      },
      ta: {
        native: 'உங்களிடம் மருந்து, கட்டுத்துணி அல்லது ஆன்டிசெப்டிக் உள்ளதா?',
        roman: 'Ungalidam marundhu, kattuthuni alladhu antiseptic ulladha?',
      },
      te: {
        native: 'మీ వద్ద మందులు, బ్యాండేజ్ లేదా యాంటీసెప్టిక్ ఉన్నాయా?',
        roman: 'Mee vadda mandulu, bandage leda antiseptic unnaya?',
      },
      mr: {
        native: 'तुमच्याकडे औषधे, पट्टी किंवा अँटीसेप्टिक आहे का?',
        roman: 'Tumchyakade aushadhe, patti kinva antiseptic aahe ka?',
      },
      gu: {
        native: 'શું તમારી પાસે દવાઓ, પાટો કે એન્ટિસેપ્ટિક છે?',
        roman: 'Shu tamari paase davao, paato ke antiseptic chhe?',
      },
      kn: {
        native: 'ನಿಮ್ಮ ಬಳಿ ಔಷಧಿ, ಬ್ಯಾಂಡೇಜ್ ಅಥವಾ ಆಂಟಿಸೆಪ್ಟಿಕ್ ಇದೆಯೇ?',
        roman: 'Nimma bali aushadhi, bandage athava antiseptic ideye?',
      },
      ml: {
        native: 'നിങ്ങളുടെ കൈയിൽ മരുന്നോ ബാൻഡേജോ ആന്റിസെപ്റ്റിക്കോ ഉണ്ടോ?',
        roman: 'Ningalude kayyil marunno bandage-o antiseptic-o undo?',
      },
      pa: {
        native: 'ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਦਵਾਈ, ਪੱਟੀ ਜਾਂ ਐਂਟੀਸੈਪਟਿਕ ਹੈ?',
        roman: 'Ki tuhade kol dawai, patti jaan antiseptic hai?',
      },
      or: {
        native: 'ଆପଣଙ୍କ ପାଖରେ ଔଷଧ, ବ୍ୟାଣ୍ଡେଜ୍ କିମ୍ବା ଆଣ୍ଟିସେପ୍ଟିକ୍ ଅଛି କି?',
        roman: 'Apananka pakhare aushadha, bandage kimba antiseptic achhi ki?',
      },
      as: {
        native: 'আপোনাৰ ওচৰত ঔষধ, বেণ্ডেজ বা এণ্টিচেপ্টিক আছে নেকি?',
        roman: 'Aponar osorot ouxodh, bandage ba antiseptic ase neki?',
      },
    },
  },
  {
    id: 'bitten-scratched',
    category: 'medical',
    en: 'Have you been bitten or scratched?',
    translations: {
      hi: {
        native: 'क्या आपको किसी ने काटा या खरोंचा है?',
        roman: 'Kya aapko kisi ne kaata ya kharoncha hai?',
      },
      bn: {
        native: 'আপনাকে কি কেউ কামড়েছে বা আঁচড়েছে?',
        roman: 'Apnake ki keu kamrechhe ba anchrechhe?',
      },
      ta: {
        native: 'உங்களை யாராவது கடித்தார்களா அல்லது கீறினார்களா?',
        roman: 'Ungalai yaaravadhu kadithargala alladhu keerinargala?',
      },
      te: {
        native: 'మిమ్మల్ని ఏదైనా కరిచిందా లేదా గీసుకుందా?',
        roman: 'Mimmalni edaina karichinda leda geesukunda?',
      },
      mr: {
        native: 'तुम्हाला कोणी चावले किंवा ओरखडले आहे का?',
        roman: 'Tumhala koni chaavle kinva orakhadle aahe ka?',
      },
      gu: {
        native: 'શું તમને કોઈએ કરડ્યું છે કે ઉઝરડો પડ્યો છે?',
        roman: 'Shu tamne koiye karadyu chhe ke ujardo padyo chhe?',
      },
      kn: {
        native: 'ನಿಮಗೆ ಏನಾದರೂ ಕಚ್ಚಿದೆಯೇ ಅಥವಾ ಗೀರಿದೆಯೇ?',
        roman: 'Nimage enadaru kachideye athava geerideye?',
      },
      ml: {
        native: 'നിങ്ങൾക്ക് കടിയോ മാന്തലോ ഏറ്റിട്ടുണ്ടോ?',
        roman: 'Ningalkku kadiyo maanthalo ettitundo?',
      },
      pa: {
        native: 'ਕੀ ਤੁਹਾਨੂੰ ਕਿਸੇ ਨੇ ਕੱਟਿਆ ਜਾਂ ਖਰੋਚਿਆ ਹੈ?',
        roman: 'Ki tuhanu kise ne kattiya jaan kharochiya hai?',
      },
      or: {
        native: 'ଆପଣଙ୍କୁ କେହି କାମୁଡ଼ିଛି କିମ୍ବା ରାମ୍ପୁଡ଼ିଛି କି?',
        roman: 'Apananku kehi kamudichi kimba rampudichi ki?',
      },
      as: {
        native: 'আপোনাক কোনোবাই কামুৰিছে বা আঁচুৰিছে নেকি?',
        roman: 'Aponak konobai kamurise ba asurise neki?',
      },
    },
  },
  {
    id: 'children-elderly',
    category: 'medical',
    en: 'We have children and elderly people with us.',
    translations: {
      hi: {
        native: 'हमारे साथ बच्चे और बुजुर्ग लोग हैं।',
        roman: 'Hamare saath bachche aur buzurg log hain.',
      },
      bn: {
        native: 'আমাদের সাথে শিশু এবং বয়স্ক মানুষ আছেন।',
        roman: 'Amader shathe shishu ebong boyoshko manush achhen.',
      },
      ta: {
        native: 'எங்களுடன் குழந்தைகளும் முதியவர்களும் உள்ளனர்.',
        roman: 'Engaludan kuzhandhaigalum mudhiyavargalum ullanar.',
      },
      te: {
        native: 'మాతో పిల్లలు మరియు వృద్ధులు ఉన్నారు.',
        roman: 'Maatho pillalu mariyu vruddhulu unnaru.',
      },
      mr: {
        native: 'आमच्यासोबत लहान मुले आणि वृद्ध लोक आहेत.',
        roman: 'Aamchyasobat lahan mule aani vruddha lok aahet.',
      },
      gu: {
        native: 'અમારી સાથે બાળકો અને વૃદ્ધો છે.',
        roman: 'Amari saathe baalko ane vruddho chhe.',
      },
      kn: {
        native: 'ನಮ್ಮೊಂದಿಗೆ ಮಕ್ಕಳು ಮತ್ತು ವೃದ್ಧರು ಇದ್ದಾರೆ.',
        roman: 'Nammondige makkalu mattu vruddharu iddare.',
      },
      ml: {
        native: 'ഞങ്ങളുടെ കൂടെ കുട്ടികളും പ്രായമായവരുമുണ്ട്.',
        roman: 'Njangalude koode kuttikalum prayamayavarumundu.',
      },
      pa: {
        native: 'ਸਾਡੇ ਨਾਲ ਬੱਚੇ ਅਤੇ ਬਜ਼ੁਰਗ ਲੋਕ ਹਨ।',
        roman: 'Saade naal bachhe ate buzurg lok han.',
      },
      or: {
        native: 'ଆମ ସହିତ ଛୋଟ ପିଲା ଏବଂ ବୟସ୍କ ଲୋକ ଅଛନ୍ତି।',
        roman: 'Ama sahita chhota pila ebam bayaska loka achhanti.',
      },
      as: {
        native: 'আমাৰ লগত সৰু ল’ৰা-ছোৱালী আৰু বৃদ্ধ লোক আছে।',
        roman: 'Amar logot horu lora-sowali aru briddho lok ase.',
      },
    },
  },
  {
    id: 'food-safe',
    category: 'water-food',
    en: 'Is this food safe to eat?',
    translations: {
      hi: {
        native: 'क्या यह खाना खाने के लिए सुरक्षित है?',
        roman: 'Kya yeh khaana khaane ke liye surakshit hai?',
      },
      bn: {
        native: 'এই খাবার কি খাওয়ার জন্য নিরাপদ?',
        roman: 'Ei khabar ki khawar jonno nirapod?',
      },
      ta: {
        native: 'இந்த உணவு சாப்பிட பாதுகாப்பானதா?',
        roman: 'Indha unavu saappida paadhugaappanadha?',
      },
      te: {
        native: 'ఈ ఆహారం తినడానికి సురక్షితమేనా?',
        roman: 'Ee aahaaram tinadaaniki surakshitamena?',
      },
      mr: {
        native: 'हे अन्न खाण्यासाठी सुरक्षित आहे का?',
        roman: 'He anna khanyasathi surakshit aahe ka?',
      },
      gu: {
        native: 'શું આ ખોરાક ખાવા માટે સુરક્ષિત છે?',
        roman: 'Shu aa khorak khava mate surakshit chhe?',
      },
      kn: {
        native: 'ಈ ಆಹಾರ ತಿನ್ನಲು ಸುರಕ್ಷಿತವಾಗಿದೆಯೇ?',
        roman: 'Ee aahaara tinnalu surakshitavagideye?',
      },
      ml: {
        native: 'ഈ ഭക്ഷണം കഴിക്കാൻ സുരക്ഷിതമാണോ?',
        roman: 'Ee bhakshanam kazhikkan surakshitamaano?',
      },
      pa: {
        native: 'ਕੀ ਇਹ ਖਾਣਾ ਖਾਣ ਲਈ ਸੁਰੱਖਿਅਤ ਹੈ?',
        roman: 'Ki eh khaana khaan layi surakhiat hai?',
      },
      or: {
        native: 'ଏହି ଖାଦ୍ୟ ଖାଇବା ପାଇଁ ସୁରକ୍ଷିତ କି?',
        roman: 'Ehi khadya khaiba pain surakshita ki?',
      },
      as: {
        native: 'এই খাদ্য খোৱাৰ বাবে সুৰক্ষিত নেকি?',
        roman: 'Ei khadyo khowar babe hurokhito neki?',
      },
    },
  },
  {
    id: 'nearest-water-source',
    category: 'water-food',
    en: 'Which direction is the nearest river or well?',
    translations: {
      hi: {
        native: 'सबसे नजदीकी नदी या कुआँ किस दिशा में है?',
        roman: 'Sabse nazdeeki nadi ya kuan kis disha mein hai?',
      },
      bn: {
        native: 'সবচেয়ে কাছের নদী বা কুয়ো কোন দিকে?',
        roman: 'Shobcheye kachher nodi ba kuyo kon dike?',
      },
      ta: {
        native: 'அருகிலுள்ள ஆறு அல்லது கிணறு எந்த திசையில் உள்ளது?',
        roman: 'Arugilulla aaru alladhu kinaru endha dhisaiyil ulladhu?',
      },
      te: {
        native: 'దగ్గరలోని నది లేదా బావి ఏ దిక్కున ఉంది?',
        roman: 'Daggaraloni nadi leda baavi ye dikkuna undi?',
      },
      mr: {
        native: 'सर्वात जवळची नदी किंवा विहीर कोणत्या दिशेला आहे?',
        roman: 'Sarvat javalchi nadi kinva vihir kontya dishela aahe?',
      },
      gu: {
        native: 'સૌથી નજીકની નદી કે કૂવો કઈ દિશામાં છે?',
        roman: 'Sauthi najikni nadi ke kuvo kai dishama chhe?',
      },
      kn: {
        native: 'ಹತ್ತಿರದ ನದಿ ಅಥವಾ ಬಾವಿ ಯಾವ ದಿಕ್ಕಿನಲ್ಲಿದೆ?',
        roman: 'Hattirada nadi athava baavi yaava dikkinallide?',
      },
      ml: {
        native: 'ഏറ്റവും അടുത്തുള്ള പുഴയോ കിണറോ ഏത് ദിശയിലാണ്?',
        roman: 'Ettavum aduthulla puzhayoo kinaro ethu dishayilanu?',
      },
      pa: {
        native: 'ਸਭ ਤੋਂ ਨੇੜਲੀ ਨਦੀ ਜਾਂ ਖੂਹ ਕਿਸ ਦਿਸ਼ਾ ਵਿੱਚ ਹੈ?',
        roman: 'Sabh ton nedli nadi jaan khooh kis disha vich hai?',
      },
      or: {
        native: 'ସବୁଠାରୁ ନିକଟତମ ନଦୀ ବା କୂଅ କେଉଁ ଦିଗରେ ଅଛି?',
        roman: 'Sabutharu nikatatama nadi ba kua keun digare achhi?',
      },
      as: {
        native: 'আটাইতকৈ ওচৰৰ নৈ বা কুঁৱা কোন দিশত আছে?',
        roman: 'Ataitkoi osoror noi ba kuwa kon dixot ase?',
      },
    },
  },
  {
    id: 'need-fire-blankets',
    category: 'water-food',
    en: 'We need fire and dry blankets before nightfall.',
    translations: {
      hi: {
        native: 'रात होने से पहले हमें आग और सूखे कंबल चाहिए।',
        roman: 'Raat hone se pehle hamein aag aur sookhe kambal chahiye.',
      },
      bn: {
        native: 'রাত নামার আগে আমাদের আগুন ও শুকনো কম্বল দরকার।',
        roman: 'Raat namar aage amader agun o shukno kombol dorkar.',
      },
      ta: {
        native: 'இரவுக்கு முன் எங்களுக்கு நெருப்பும் உலர்ந்த போர்வையும் வேண்டும்.',
        roman: 'Iravukku mun engalukku neruppum ularndha porvaiyum vendum.',
      },
      te: {
        native: 'రాత్రి కాకముందే మాకు మంట మరియు పొడి దుప్పట్లు కావాలి.',
        roman: 'Raatri kaakamunde maaku manta mariyu podi duppatlu kaavaali.',
      },
      mr: {
        native: 'रात्र होण्यापूर्वी आम्हाला आग आणि कोरडी पांघरुणे हवी आहेत.',
        roman: 'Ratra honyapurvi aamhala aag aani kordi pangharune havi aahet.',
      },
      gu: {
        native: 'રાત પડે તે પહેલાં અમને આગ અને સૂકા ધાબળા જોઈએ છે.',
        roman: 'Raat pade te pahela amne aag ane sooka dhabla joiye chhe.',
      },
      kn: {
        native: 'ಕತ್ತಲಾಗುವ ಮುನ್ನ ನಮಗೆ ಬೆಂಕಿ ಮತ್ತು ಒಣ ಹೊದಿಕೆ ಬೇಕು.',
        roman: 'Kattalaaguva munna namage benki mattu ona hodike beku.',
      },
      ml: {
        native: 'രാത്രിയാകും മുമ്പ് ഞങ്ങൾക്ക് തീയും ഉണങ്ങിയ പുതപ്പും വേണം.',
        roman: 'Raathriyaakum mumbu njangalkku theeyum unangiya puthappum venam.',
      },
      pa: {
        native: 'ਰਾਤ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਸਾਨੂੰ ਅੱਗ ਅਤੇ ਸੁੱਕੇ ਕੰਬਲ ਚਾਹੀਦੇ ਹਨ।',
        roman: 'Raat hon ton pehlan saanu agg ate sukke kambal chahide han.',
      },
      or: {
        native: 'ରାତି ହେବା ପୂର୍ବରୁ ଆମକୁ ନିଆଁ ଏବଂ ଶୁଖିଲା କମ୍ବଳ ଦରକାର।',
        roman: 'Rati heba purbaru amaku nian ebam sukhila kambala darakar.',
      },
      as: {
        native: 'ৰাতি হোৱাৰ আগতে আমাক জুই আৰু শুকান কম্বল লাগে।',
        roman: 'Rati howar agote amak jui aru hukan kombol lage.',
      },
    },
  },
  {
    id: 'follow-me-low',
    category: 'danger-shelter',
    en: 'Follow me quickly and stay low.',
    translations: {
      hi: {
        native: 'जल्दी मेरे पीछे आओ और झुक कर चलो।',
        roman: 'Jaldi mere peeche aao aur jhuk kar chalo.',
      },
      bn: {
        native: 'তাড়াতাড়ি আমার পেছনে আসুন এবং নিচু হয়ে চলুন।',
        roman: 'Taratari amar pechhone ashun ebong nichu hoye cholun.',
      },
      ta: {
        native: 'வேகமாக என்னைப் பின்தொடர்ந்து குனிந்து செல்லுங்கள்.',
        roman: 'Vegamaga ennai pinthodarndhu kunindhu sellungal.',
      },
      te: {
        native: 'త్వరగా నా వెనుక రండి మరియు వంగి నడవండి.',
        roman: 'Tvaraga naa venuka randi mariyu vangi nadavandi.',
      },
      mr: {
        native: 'लवकर माझ्या मागे या आणि खाली वाकून चला.',
        roman: 'Lavkar majhya maage ya aani khali vaakun chala.',
      },
      gu: {
        native: 'ઝડપથી મારી પાછળ આવો અને નીચા નમીને ચાલો.',
        roman: 'Zadapthi maari paachhal aavo ane neecha namine chaalo.',
      },
      kn: {
        native: 'ಬೇಗನೆ ನನ್ನ ಹಿಂದೆ ಬನ್ನಿ ಮತ್ತು ಬಗ್ಗಿ ನಡೆಯಿರಿ.',
        roman: 'Begane nanna hinde banni mattu baggi nadeyiri.',
      },
      ml: {
        native: 'വേഗം എന്റെ പിന്നാലെ വരൂ, കുനിഞ്ഞു നടക്കൂ.',
        roman: 'Vegam ente pinnale varu, kuninju nadakku.',
      },
      pa: {
        native: 'ਜਲਦੀ ਮੇਰੇ ਪਿੱਛੇ ਆਓ ਅਤੇ ਝੁਕ ਕੇ ਚੱਲੋ।',
        roman: 'Jaldi mere pichhe aao ate jhuk ke challo.',
      },
      or: {
        native: 'ଶୀଘ୍ର ମୋ ପଛରେ ଆସନ୍ତୁ ଏବଂ ନଇଁକି ଚାଲନ୍ତୁ।',
        roman: 'Shighra mo pachhare asantu ebam nainki chalantu.',
      },
      as: {
        native: 'সোনকালে মোৰ পিছে পিছে আহক আৰু হাউলি খোজ কাঢ়ক।',
        roman: 'Honkale mor pise pise ahok aru hauli khoj karhok.',
      },
    },
  },
  {
    id: 'nearest-hospital-camp',
    category: 'medical',
    en: 'Where is the nearest hospital or relief camp?',
    translations: {
      hi: {
        native: 'सबसे नजदीकी अस्पताल या राहत शिविर कहाँ है?',
        roman: 'Sabse nazdeeki aspatal ya rahat shivir kahan hai?',
      },
      bn: {
        native: 'সবচেয়ে কাছের হাসপাতাল বা ত্রাণ শিবির কোথায়?',
        roman: 'Shobcheye kachher haspatal ba traan shibir kothay?',
      },
      ta: {
        native: 'அருகிலுள்ள மருத்துவமனை அல்லது நிவாரண முகாம் எங்கே உள்ளது?',
        roman: 'Arugilulla maruthuvamanai alladhu nivaarana mugaam enge ulladhu?',
      },
      te: {
        native: 'దగ్గరలోని ఆసుపత్రి లేదా సహాయక శిబిరం ఎక్కడ ఉంది?',
        roman: 'Daggaraloni aasupatri leda sahaayaka shibiram ekkada undi?',
      },
      mr: {
        native: 'सर्वात जवळचे रुग्णालय किंवा मदत शिबिर कुठे आहे?',
        roman: 'Sarvat javalche rugnalay kinva madat shibir kuthe aahe?',
      },
      gu: {
        native: 'સૌથી નજીકની હોસ્પિટલ કે રાહત શિબિર ક્યાં છે?',
        roman: 'Sauthi najikni hospital ke rahat shibir kyan chhe?',
      },
      kn: {
        native: 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಅಥವಾ ಪರಿಹಾರ ಶಿಬಿರ ಎಲ್ಲಿದೆ?',
        roman: 'Hattirada aaspatre athava parihaara shibira ellide?',
      },
      ml: {
        native: 'ഏറ്റവും അടുത്തുള്ള ആശുപത്രിയോ ദുരിതാശ്വാസ ക്യാമ്പോ എവിടെയാണ്?',
        roman: 'Ettavum aduthulla aashupathriyo durithashwasa camp-o evideyanu?',
      },
      pa: {
        native: 'ਸਭ ਤੋਂ ਨੇੜਲਾ ਹਸਪਤਾਲ ਜਾਂ ਰਾਹਤ ਕੈਂਪ ਕਿੱਥੇ ਹੈ?',
        roman: 'Sabh ton nedla haspatal jaan rahat camp kithe hai?',
      },
      or: {
        native: 'ସବୁଠାରୁ ନିକଟସ୍ଥ ଡାକ୍ତରଖାନା ବା ରିଲିଫ୍ କ୍ୟାମ୍ପ କେଉଁଠି ଅଛି?',
        roman: 'Sabutharu nikatastha daktarkhana ba relief camp keunthi achhi?',
      },
      as: {
        native: 'আটাইতকৈ ওচৰৰ চিকিৎসালয় বা সাহায্য শিবিৰ ক’ত আছে?',
        roman: 'Ataitkoi osoror chikitsaloy ba hohay hibir kot ase?',
      },
    },
  },
  {
    id: 'road-blocked',
    category: 'danger-shelter',
    en: 'The road ahead is blocked. Do you know an alternate route?',
    translations: {
      hi: {
        native: 'आगे रास्ता बंद है। क्या आपको कोई दूसरा रास्ता पता है?',
        roman: 'Aage raasta band hai. Kya aapko koi doosra raasta pata hai?',
      },
      bn: {
        native: 'সামনের রাস্তা বন্ধ। আপনি কি অন্য কোনো পথ জানেন?',
        roman: 'Shamner rasta bondho. Apni ki onno kono poth janen?',
      },
      ta: {
        native: 'முன்னால் சாலை மூடப்பட்டுள்ளது. மாற்று வழி தெரியுமா?',
        roman: 'Munnal saalai moodappattulladhu. Maatru vazhi theriyuma?',
      },
      te: {
        native: 'ముందు రహదారి మూసివేయబడింది. మీకు వేరే దారి తెలుసా?',
        roman: 'Mundu rahadaari moosiveyabadindi. Meeku vere daari telusa?',
      },
      mr: {
        native: 'पुढचा रस्ता बंद आहे. तुम्हाला दुसरा मार्ग माहीत आहे का?',
        roman: 'Pudhcha rasta band aahe. Tumhala dusra maarg mahit aahe ka?',
      },
      gu: {
        native: 'આગળનો રસ્તો બંધ છે. શું તમને બીજો કોઈ રસ્તો ખબર છે?',
        roman: 'Aagalno rasto bandh chhe. Shu tamne bijo koi rasto khabar chhe?',
      },
      kn: {
        native: 'ಮುಂದಿನ ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ. ನಿಮಗೆ ಪರ್ಯಾಯ ದಾರಿ ಗೊತ್ತೇ?',
        roman: 'Mundina raste muchalagide. Nimage paryaaya daari gotte?',
      },
      ml: {
        native: 'മുന്നിലെ വഴി അടച്ചിരിക്കുകയാണ്. മറ്റൊരു വഴി അറിയാമോ?',
        roman: 'Munnile vazhi adachirikkukayanu. Mattoru vazhi ariyamo?',
      },
      pa: {
        native: 'ਅੱਗੇ ਰਸਤਾ ਬੰਦ ਹੈ। ਕੀ ਤੁਹਾਨੂੰ ਕੋਈ ਹੋਰ ਰਸਤਾ ਪਤਾ ਹੈ?',
        roman: 'Agge rasta band hai. Ki tuhanu koi hor rasta pata hai?',
      },
      or: {
        native: 'ଆଗକୁ ରାସ୍ତା ବନ୍ଦ ଅଛି। ଆପଣ ଅନ୍ୟ କୌଣସି ବାଟ ଜାଣନ୍ତି କି?',
        roman: 'Agaku rasta banda achhi. Apana anya kaunasi bata jananti ki?',
      },
      as: {
        native: 'আগত ৰাস্তা বন্ধ আছে। আপুনি আন কোনো বাট জানে নেকি?',
        roman: 'Agot rasta bondho ase. Apuni aan kono baat jane neki?',
      },
    },
  },
];
