import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// Brand SVG marks — Simple Icons (CC0). Use fill="currentColor" so tile color drives them.
const BRAND_ICONS: Record<string, ReactNode> = {
  postgres: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2321-1.6533.3411-2.2935.1312-2.5256-.0191 1.342-2.0482 2.445-4.522 3.0411-6.8297.2714-1.0507.7982-3.5237.1222-4.7316a1.5641 1.5641 0 0 0-.1509-.235C21.6931.9086 19.8007.0248 17.5099.0005c-1.4947-.0158-2.7705.3461-3.1161.4794a9.449 9.449 0 0 0-.5159-.0816 8.044 8.044 0 0 0-1.3114-.1278c-1.1822-.0184-2.2038.2642-3.0498.8406-.8573-.3211-4.7888-1.645-7.2219.0788C.9359 2.1526.3086 3.8733.4302 6.3043c.0409.818.5069 3.334 1.2423 5.7436.4598 1.5065.9387 2.7019 1.4334 3.582.553.9942 1.1259 1.5933 1.7143 1.7895.4474.1491 1.1327.1441 1.8581-.7279.8012-.9635 1.5903-1.8258 1.9446-2.2069.4351.2355.9064.3625 1.39.3772a.0569.0569 0 0 0 .0004.0041 11.0312 11.0312 0 0 0-.2472.3054c-.3389.4302-.4094.5197-1.5002.7443-.3102.064-1.1344.2339-1.1464.8115-.0025.1224.0329.2309.0919.3268.2269.4231.9216.6097 1.015.6331 1.3345.3335 2.5044.092 3.3714-.6787-.017 2.231.0775 4.4174.3454 5.0874.2212.5529.7618 1.9045 2.4692 1.9043.2505 0 .5263-.0291.8296-.0941 1.7819-.3821 2.5557-1.1696 2.855-2.9059.1503-.8707.4016-2.8753.5388-4.1012.0169-.0703.0357-.1207.057-.1362.0007-.0005.0697-.0471.4272.0307a.3673.3673 0 0 0 .0443.0068l.2539.0223.0149.001c.8468.0384 1.9114-.1426 2.5312-.4308.6438-.2988 1.8057-1.0323 1.5951-1.6698zM2.371 11.8765c-.7435-2.4358-1.1779-4.8851-1.2123-5.5719-.1086-2.1714.4171-3.6829 1.5623-4.4927 1.8367-1.2986 4.8398-.5408 6.108-.13-.0032.0032-.0066.0061-.0098.0094-2.0238 2.044-1.9758 5.536-1.9708 5.7495-.0002.0823.0066.1989.0162.3593.0348.5873.0996 1.6804-.0735 2.9184-.1609 1.1504.1937 2.2764.9728 3.0892.0806.0841.1648.1631.2518.2374-.3468.3714-1.1004 1.1926-1.9025 2.1576-.5677.6825-.9597.5517-1.0886.5087-.3919-.1307-.813-.5871-1.2381-1.3223-.4796-.839-.9635-2.0317-1.4155-3.5126zm6.0072 5.0871c-.1711-.0428-.3271-.1132-.4322-.1772.0889-.0394.2374-.0902.4833-.1409 1.2833-.2641 1.4815-.4506 1.9143-1.0002.0992-.126.2116-.2687.3673-.4426a.3549.3549 0 0 0 .0737-.1298c.1708-.1513.2724-.1099.4369-.0417.156.0646.3078.26.3695.4752.0291.1016.0619.2945-.0452.4444-.9043 1.2658-2.2216 1.2494-3.1676 1.0128zm2.094-3.988-.0525.141c-.133.3566-.2567.6881-.3334 1.003-.6674-.0021-1.3168-.2872-1.8105-.8024-.6279-.6551-.9131-1.5664-.7825-2.5004.1828-1.3079.1153-2.4468.079-3.0586-.005-.0857-.0095-.1607-.0122-.2199.2957-.2621 1.6659-.9962 2.6429-.7724.4459.1022.7176.4057.8305.928.5846 2.7038.0774 3.8307-.3302 4.7363-.084.1866-.1633.3629-.2311.5454zm7.3637 4.5725c-.0169.1768-.0358.376-.0618.5959l-.146.4383a.3547.3547 0 0 0-.0182.1077c-.0059.4747-.054.6489-.115.8693-.0634.2292-.1353.4891-.1794 1.0575-.11 1.4143-.8782 2.2267-2.4172 2.5565-1.5155.3251-1.7843-.4968-2.0212-1.2217a6.5824 6.5824 0 0 0-.0769-.2266c-.2154-.5858-.1911-1.4119-.1574-2.5551.0165-.5612-.0249-1.9013-.3302-2.6462.0044-.2932.0106-.5909.019-.8918a.3529.3529 0 0 0-.0153-.1126 1.4927 1.4927 0 0 0-.0439-.208c-.1226-.4283-.4213-.7866-.7797-.9351-.1424-.059-.4038-.1672-.7178-.0869.067-.276.1831-.5875.309-.9249l.0529-.142c.0595-.16.134-.3257.213-.5012.4265-.9476 1.0106-2.2453.3766-5.1772-.2374-1.0981-1.0304-1.6343-2.2324-1.5098-.7207.0746-1.3799.3654-1.7088.5321a5.6716 5.6716 0 0 0-.1958.1041c.0918-1.1064.4386-3.1741 1.7357-4.4823a4.0306 4.0306 0 0 1 .3033-.276.3532.3532 0 0 0 .1447-.0644c.7524-.5706 1.6945-.8506 2.802-.8325.4091.0067.8017.0339 1.1742.081 1.939.3544 3.2439 1.4468 4.0359 2.3827.8143.9623 1.2552 1.9315 1.4312 2.4543-1.3232-.1346-2.2234.1268-2.6797.779-.9926 1.4189.543 4.1729 1.2811 5.4964.1353.2426.2522.4522.2889.5413.2403.5825.5515.9713.7787 1.2552.0696.087.1372.1714.1885.245-.4008.1155-1.1208.3825-1.0552 1.717-.0123.1563-.0423.4469-.0834.8148-.0461.2077-.0702.4603-.0994.7662zm.8905-1.6211c-.0405-.8316.2691-.9185.5967-1.0105a2.8566 2.8566 0 0 0 .135-.0406 1.202 1.202 0 0 0 .1342.103c.5703.3765 1.5823.4213 3.0068.1344-.2016.1769-.5189.3994-.9533.6011-.4098.1903-1.0957.333-1.7473.3636-.7197.0336-1.0859-.0807-1.1721-.151zm.5695-9.2712c-.0059.3508-.0542.6692-.1054 1.0017-.055.3576-.112.7274-.1264 1.1762-.0142.4368.0404.8909.0932 1.3301.1066.887.216 1.8003-.2075 2.7014a3.5272 3.5272 0 0 1-.1876-.3856c-.0527-.1276-.1669-.3326-.3251-.6162-.6156-1.1041-2.0574-3.6896-1.3193-4.7446.3795-.5427 1.3408-.5661 2.1781-.463zm.2284 7.0137a12.3762 12.3762 0 0 0-.0853-.1074l-.0355-.0444c.7262-1.1995.5842-2.3862.4578-3.4385-.0519-.4318-.1009-.8396-.0885-1.2226.0129-.4061.0666-.7543.1185-1.0911.0639-.415.1288-.8443.1109-1.3505.0134-.0531.0188-.1158.0118-.1902-.0457-.4855-.5999-1.938-1.7294-3.253-.6076-.7073-1.4896-1.4972-2.6889-2.0395.5251-.1066 1.2328-.2035 2.0244-.1859 2.0515.0456 3.6746.8135 4.8242 2.2824a.908.908 0 0 1 .0667.1002c.7231 1.3556-.2762 6.2751-2.9867 10.5405zm-8.8166-6.1162c-.025.1794-.3089.4225-.6211.4225a.5821.5821 0 0 1-.0809-.0056c-.1873-.026-.3765-.144-.5059-.3156-.0458-.0605-.1203-.178-.1055-.2844.0055-.0401.0261-.0985.0925-.1488.1182-.0894.3518-.1226.6096-.0867.3163.0441.6426.1938.6113.4186zm7.9305-.4114c.0111.0792-.049.201-.1531.3102-.0683.0717-.212.1961-.4079.2232a.5456.5456 0 0 1-.075.0052c-.2935 0-.5414-.2344-.5607-.3717-.024-.1765.2641-.3106.5611-.352.297-.0414.6111.0088.6356.1851z" />
    </svg>
  ),
  sheets: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6h6l-6-6zm1.363 10.636h-3.41v1.91h3.41v-1.91zm0 3.273h-3.41v1.91h3.41v-1.91zM20.727 6.5v15.864c0 .904-.732 1.636-1.636 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.318v6.5h6.5zm-3.273 2.773H6.545v7.909h10.91v-7.91zm-6.136 4.636H7.91v1.91h3.41v-1.91z" />
    </svg>
  ),
  notion: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  ),
  linear: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
    </svg>
  ),
  airtable: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M11.992 1.966c-.434 0-.87.086-1.28.257L1.779 5.917c-.503.208-.49.908.012 1.116l8.982 3.558a3.266 3.266 0 0 0 2.454 0l8.982-3.558c.503-.196.503-.908.012-1.116l-8.957-3.694a3.255 3.255 0 0 0-1.272-.257zM23.4 8.056a.589.589 0 0 0-.222.045l-10.012 3.877a.612.612 0 0 0-.38.564v8.896a.6.6 0 0 0 .821.552L23.62 18.1a.583.583 0 0 0 .38-.551V8.653a.6.6 0 0 0-.6-.596zM.676 8.095a.644.644 0 0 0-.48.19C.086 8.396 0 8.53 0 8.69v8.355c0 .442.515.737.908.54l6.27-3.006.307-.147 2.969-1.436c.466-.22.43-.908-.061-1.092L.883 8.138a.57.57 0 0 0-.207-.044z" />
    </svg>
  ),
  mysql: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.14-.04-.067-.126-.1-.18-.153zM5.77 18.695h-.927a50.854 50.854 0 00-.27-4.41h-.008l-1.41 4.41H2.45l-1.4-4.41h-.01a72.892 72.892 0 00-.195 4.41H0c.055-1.966.192-3.81.41-5.53h1.15l1.335 4.064h.008l1.347-4.064h1.095c.242 2.015.384 3.86.428 5.53zm4.017-4.08c-.378 2.045-.876 3.533-1.492 4.46-.482.716-1.01 1.073-1.583 1.073-.153 0-.34-.046-.566-.138v-.494c.11.017.24.026.386.026.268 0 .483-.075.647-.222.197-.18.295-.382.295-.605 0-.155-.077-.47-.23-.944L6.23 14.615h.91l.727 2.36c.164.536.233.91.205 1.123.4-1.064.678-2.227.835-3.483zm12.325 4.08h-2.63v-5.53h.885v4.85h1.745zm-3.32.135l-1.016-.5c.09-.076.177-.158.255-.25.433-.506.648-1.258.648-2.253 0-1.83-.718-2.746-2.155-2.746-.704 0-1.254.232-1.65.697-.43.508-.646 1.256-.646 2.245 0 .972.19 1.686.574 2.14.35.41.877.615 1.583.615.264 0 .506-.033.725-.098l1.325.772.36-.622zM15.5 17.588c-.225-.36-.337-.94-.337-1.736 0-1.393.424-2.09 1.27-2.09.443 0 .77.167.977.5.224.362.336.936.336 1.723 0 1.404-.424 2.108-1.27 2.108-.445 0-.77-.167-.978-.5zm-1.658-.425c0 .47-.172.856-.516 1.156-.344.3-.803.45-1.384.45-.543 0-1.064-.172-1.573-.515l.237-.476c.438.22.833.328 1.19.328.332 0 .593-.073.783-.22a.754.754 0 00.3-.615c0-.33-.23-.61-.648-.845-.388-.213-1.163-.657-1.163-.657-.422-.307-.632-.636-.632-1.177 0-.45.157-.81.47-1.085.315-.278.72-.415 1.22-.415.512 0 .98.136 1.4.41l-.213.476a2.726 2.726 0 00-1.064-.23c-.283 0-.502.068-.654.206a.685.685 0 00-.248.524c0 .328.234.61.666.85.393.215 1.187.67 1.187.67.433.305.648.63.648 1.168zm9.382-5.852c-.535-.014-.95.04-1.297.188-.1.04-.26.04-.274.167.055.053.063.14.11.214.08.134.218.313.346.407.14.11.28.216.427.31.26.16.555.255.81.416.145.094.293.213.44.313.073.05.12.14.214.172v-.02c-.046-.06-.06-.147-.105-.214-.067-.067-.134-.127-.2-.193a3.223 3.223 0 00-.695-.675c-.214-.146-.682-.35-.77-.595l-.013-.014c.146-.013.32-.066.46-.106.227-.06.435-.047.67-.106.106-.027.213-.06.32-.094v-.06c-.12-.12-.21-.283-.334-.395a8.867 8.867 0 00-1.104-.823c-.21-.134-.476-.22-.697-.334-.08-.04-.214-.06-.26-.127-.12-.146-.19-.34-.275-.514a17.69 17.69 0 01-.547-1.163c-.12-.262-.193-.523-.34-.763-.69-1.137-1.437-1.826-2.586-2.5-.247-.14-.543-.2-.856-.274-.167-.008-.334-.02-.5-.027-.11-.047-.216-.174-.31-.235-.38-.24-1.364-.76-1.644-.072-.18.434.267.862.422 1.082.115.153.26.328.34.5.047.116.06.235.107.356.106.294.207.622.347.897.073.14.153.287.247.413.054.073.146.107.167.227-.094.136-.1.334-.154.5-.24.757-.146 1.693.194 2.25.107.166.362.534.703.393.3-.12.234-.5.32-.835.02-.08.007-.133.048-.187v.015c.094.188.188.367.274.555.206.328.566.668.867.895.16.12.287.328.487.402v-.02h-.015c-.043-.058-.1-.086-.154-.133a3.445 3.445 0 01-.35-.4 8.76 8.76 0 01-.747-1.218c-.11-.21-.202-.436-.29-.643-.04-.08-.04-.2-.107-.24-.1.146-.247.273-.32.453-.127.288-.14.642-.188 1.01-.027.007-.014 0-.027.014-.214-.052-.287-.274-.367-.46-.2-.475-.233-1.238-.06-1.785.047-.14.247-.582.167-.716-.042-.127-.174-.2-.247-.303a2.478 2.478 0 01-.24-.427c-.16-.374-.24-.788-.414-1.162-.08-.173-.22-.354-.334-.513-.127-.18-.267-.307-.368-.52-.033-.073-.08-.194-.027-.274.014-.054.042-.075.094-.09.088-.072.335.022.422.062.247.1.455.194.662.334.094.066.195.193.315.226h.14c.214.047.455.014.655.073.355.114.675.28.962.46a5.953 5.953 0 012.085 2.286c.08.154.115.295.188.455.14.33.313.663.455.982.14.315.275.636.476.897.1.14.502.213.682.286.133.06.34.115.46.188.23.14.454.3.67.454.11.076.443.243.463.378z" />
    </svg>
  ),
  bigquery: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M5.676 10.595h2.052v5.244a5.892 5.892 0 0 1-2.052-2.088v-3.156zm18.179 10.836a.504.504 0 0 1 0 .708l-1.716 1.716a.504.504 0 0 1-.708 0l-4.248-4.248a.206.206 0 0 1-.007-.007c-.02-.02-.028-.045-.043-.066a10.736 10.736 0 0 1-6.334 2.065C4.835 21.599 0 16.764 0 10.799S4.835 0 10.8 0s10.799 4.835 10.799 10.8c0 2.369-.772 4.553-2.066 6.333.025.017.052.028.074.05l4.248 4.248zm-5.028-10.632a8.015 8.015 0 1 0-8.028 8.028h.024a8.016 8.016 0 0 0 8.004-8.028zm-4.86 4.98a6.002 6.002 0 0 0 2.04-2.184v-1.764h-2.04v3.948zm-4.5.948c.442.057.887.08 1.332.072.4.025.8.025 1.2 0V7.692H9.468v9.035z" />
    </svg>
  ),
  mcp: (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M13.85 0a4.16 4.16 0 0 0-2.95 1.217L1.456 10.66a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l9.442-9.442a2.49 2.49 0 0 1 3.541 0 2.49 2.49 0 0 1 0 3.541L8.59 12.97l-.1.1a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l.1-.098 7.03-7.034a2.49 2.49 0 0 1 3.542 0l.049.05a2.49 2.49 0 0 1 0 3.54l-8.54 8.54a1.96 1.96 0 0 0 0 2.755l1.753 1.753a.835.835 0 0 0 1.18 0 .835.835 0 0 0 0-1.18l-1.753-1.753a.266.266 0 0 1 0-.394l8.54-8.54a4.185 4.185 0 0 0 0-5.9l-.05-.05a4.16 4.16 0 0 0-2.95-1.218c-.2 0-.401.02-.6.048a4.17 4.17 0 0 0-1.17-3.552A4.16 4.16 0 0 0 13.85 0m0 3.333a.84.84 0 0 0-.59.245L6.275 10.56a4.186 4.186 0 0 0 0 5.902 4.186 4.186 0 0 0 5.902 0L19.16 9.48a.835.835 0 0 0 0-1.18.835.835 0 0 0-1.18 0l-6.985 6.984a2.49 2.49 0 0 1-3.54 0 2.49 2.49 0 0 1 0-3.54l6.983-6.985a.835.835 0 0 0 0-1.18.84.84 0 0 0-.59-.245" />
    </svg>
  ),
};

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white antialiased">
      {/* ─── Nav ─── */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Prismian
            </span>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
              <a href="#problem" className="hover:text-gray-900 transition-colors">Why</a>
              <a href="#product" className="hover:text-gray-900 transition-colors">Product</a>
              <Link to="/docs" className="hover:text-gray-900 transition-colors">Docs</Link>
              <Link to="/security" className="hover:text-gray-900 transition-colors">Security</Link>
              <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden border-b border-gray-100">
        {/* Subtle grid background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 overflow-hidden pointer-events-none"
        >
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(17,24,39,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.06) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0)_0%,rgba(255,255,255,0.85)_60%,rgba(255,255,255,1)_100%)]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <a
            href="#product"
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-1 rounded-full mb-6 hover:border-gray-300 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Postgres connector in beta
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">Sheets &amp; Notion next</span>
          </a>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 tracking-tight leading-[1.05]">
            Give every AI tool
            <br />
            on your team{" "}
            <span className="text-gray-900 underline decoration-emerald-500 decoration-[3px] underline-offset-[6px]">
              safe access to your data
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Connect Postgres once. Every MCP tool gets scoped, audited reads —
            column redaction included.{" "}
            <span className="text-gray-900 font-medium">
              No schema dumps in chat. No shared prod passwords.
            </span>
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-gray-900 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Connect your database
            </Link>
            <a
              href="#product"
              className="w-full sm:w-auto text-gray-700 px-6 py-3 rounded-md text-sm font-medium hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-xs text-gray-500 font-mono">
            read-only · encrypted at rest · agents never write to source
          </p>
        </div>
      </section>

      {/* ─── Works with strip ─── */}
      <section className="pb-12 -mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">
            Works with MCP-compatible tools
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-gray-500">
            {[
              "Claude Desktop",
              "Cursor",
              "ChatGPT",
              "Windsurf",
              "Cline",
              "Custom agents",
            ].map((tool) => (
              <span
                key={tool}
                className="text-sm font-medium hover:text-gray-800 transition-colors"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Product mock ─── */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-gray-950 rounded-2xl p-1.5 ring-1 ring-gray-200 shadow-lg shadow-gray-900/5">
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-md">
                    app.prismian.dev
                  </span>
                </div>
              </div>
              {/* Simulated app content */}
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold text-sm">Acme Corp</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      Supabase Prod · synced 2m ago
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs bg-gray-800 text-gray-200 px-2.5 py-1 rounded-md font-medium border border-gray-700">
                      Sync now
                    </span>
                    <span className="text-xs bg-gray-900 text-gray-500 px-2.5 py-1 rounded-md border border-gray-800">
                      Settings
                    </span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    {
                      name: "customers",
                      sub: "public.customers",
                      count: 4823,
                      synced: true,
                    },
                    {
                      name: "orders",
                      sub: "public.orders",
                      count: 18204,
                      synced: true,
                    },
                  ].map((c) => (
                    <div
                      key={c.name}
                      className="bg-gray-800/60 rounded-lg p-4 border border-gray-800"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">{c.name}</p>
                        {c.synced ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-emerald-500/20">
                            synced
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono border border-gray-700">
                            native
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">{c.sub}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {c.count.toLocaleString()} rows
                      </p>
                    </div>
                  ))}
                </div>
                {/* Fake activity feed */}
                <div className="text-xs space-y-2 pt-2 font-mono">
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="w-4 h-4 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-[8px] font-bold border border-gray-700">
                      A
                    </span>
                    <span>
                      <span className="text-gray-300">Cursor</span> queried{" "}
                      <span className="text-gray-300">customers</span> where
                      status='churned'
                    </span>
                    <span className="text-gray-600 ml-auto">2m ago</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="w-4 h-4 rounded bg-gray-800 text-gray-300 flex items-center justify-center text-[8px] font-bold border border-gray-700">
                      A
                    </span>
                    <span>
                      <span className="text-gray-300">Claude Desktop</span>{" "}
                      read 12 rows from{" "}
                      <span className="text-gray-300">orders</span>
                    </span>
                    <span className="text-gray-600 ml-auto">15m ago</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="w-4 h-4 rounded bg-gray-800 text-gray-400 flex items-center justify-center text-[8px] font-bold border border-gray-700">
                      S
                    </span>
                    <span>
                      <span className="text-gray-300">Sarah</span> redacted{" "}
                      <span className="text-gray-300">credit_card_last4</span>{" "}
                      from sales-agent key
                    </span>
                    <span className="text-gray-600 ml-auto">1h ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section id="problem" className="py-20 sm:py-28 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center leading-tight">
            Your AI tools can't see your data.
            <br />
            <span className="text-gray-400">So you keep pasting it into chat.</span>
          </h2>
          <p className="mt-6 text-lg text-gray-500 text-center max-w-2xl mx-auto">
            AI chats start blind—no live tables. So you paste rows, leak a
            read-only prod password into MCP configs, or build plumbing yourself.
          </p>

          <div className="mt-12 max-w-3xl mx-auto bg-gray-950 rounded-xl ring-1 ring-gray-200 shadow-lg shadow-gray-900/[0.04] overflow-hidden">
            {/* Diff header */}
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-gray-800 bg-gray-900/60">
              <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                <svg
                  className="w-3.5 h-3.5 text-gray-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 2v6h6"
                  />
                </svg>
                team-stack.diff
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                <span className="text-red-400/80">−4</span>{" "}
                <span className="text-emerald-400/80">+4</span>
              </span>
            </div>

            {/* Diff body */}
            <div className="font-mono text-[13px] leading-[1.7] py-2">
              {[
                { sign: "-", text: "Pasting the customer list into chat — again" },
                {
                  sign: "-",
                  text: "Same read-only prod password in four MCP configs",
                },
                {
                  sign: "-",
                  text: "Sales agent sees revenue, PII — everything",
                },
                {
                  sign: "-",
                  text: "Zero log of what agents read, or when",
                },
                {
                  sign: "+",
                  text: "One Postgres connector — every agent via Prismian",
                },
                {
                  sign: "+",
                  text: "Credentials encrypted — never in agent configs",
                },
                {
                  sign: "+",
                  jsx: (
                    <>
                      Per-agent columns — sales gets{" "}
                      <code className="text-emerald-300 bg-emerald-500/10 px-1 rounded">
                        email
                      </code>
                      , not{" "}
                      <code className="text-emerald-300 bg-emerald-500/10 px-1 rounded">
                        credit_card_last4
                      </code>
                    </>
                  ),
                },
                { sign: "+", text: "Audit: agent, row, timestamp" },
              ].map((line, i) => {
                const isAdd = line.sign === "+";
                return (
                  <div
                    key={i}
                    className={`flex items-start ${
                      isAdd ? "bg-emerald-500/[0.06]" : "bg-red-500/[0.05]"
                    }`}
                  >
                    <span
                      className={`w-10 text-center select-none py-1 shrink-0 ${
                        isAdd ? "text-emerald-400/90" : "text-red-400/80"
                      }`}
                    >
                      {line.sign}
                    </span>
                    <span
                      className={`flex-1 pr-4 py-1 ${
                        isAdd ? "text-gray-100" : "text-gray-400"
                      }`}
                    >
                      {line.jsx ?? line.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Diff footer */}
            <div className="flex items-center justify-between gap-4 px-4 py-2 border-t border-gray-800 bg-gray-900/60 text-[11px] font-mono text-gray-500">
              <span>
                <span className="text-gray-400">a/</span>your-current-stack
                <span className="text-gray-600 mx-1">→</span>
                <span className="text-gray-400">b/</span>prismian
              </span>
              <span className="hidden sm:inline">migration · ~5 min</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Agent conversation mock — the payoff moment ─── */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              This is what changes
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              When your AI can actually see your data, your questions stop
              being hypothetical.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            {/* The chat */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-900/5 overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                </div>
                <span className="ml-3 text-xs text-gray-500 font-mono">
                  Claude · connected to{" "}
                  <span className="text-gray-900 font-medium">
                    prismian (acme-corp)
                  </span>
                </span>
              </div>

              {/* Messages */}
              <div className="p-5 space-y-4 text-sm">
                {/* User */}
                <div className="flex gap-3 justify-end">
                  <div className="max-w-md bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                    Which enterprise customers flagged pricing concerns this
                    quarter? What did we decide about them?
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium shrink-0">
                    S
                  </div>
                </div>

                {/* Tool call */}
                <div className="ml-10 space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Called{" "}
                    <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      query_structured
                    </code>
                  </div>
                  <div className="bg-gray-950 rounded-lg p-3 text-[11px] text-gray-300 font-mono leading-relaxed">
                    <span className="text-gray-500">{`{`}</span>
                    <br />
                    <span className="ml-3">
                      <span className="text-gray-300">"collection"</span>:{" "}
                      <span className="text-emerald-400">"customers"</span>,
                    </span>
                    <br />
                    <span className="ml-3">
                      <span className="text-gray-300">"filters"</span>: [
                    </span>
                    <br />
                    <span className="ml-6 text-gray-400">
                      {`{ field: "plan", op: "eq", value: "enterprise" }`},
                    </span>
                    <br />
                    <span className="ml-6 text-gray-400">
                      {`{ field: "status", op: "eq", value: "at_risk" }`}
                    </span>
                    <br />
                    <span className="ml-3">]</span>
                    <br />
                    <span className="text-gray-500">{`}`}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    Returned 4 rows · <span>216ms</span>
                  </div>
                </div>

                {/* Agent response */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    C
                  </div>
                  <div className="max-w-md bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 space-y-2">
                    <p>
                      Four enterprise customers are flagged{" "}
                      <code className="bg-white/80 px-1 rounded text-xs">
                        at_risk
                      </code>{" "}
                      right now:
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">·</span>
                        <span>
                          <span className="font-medium">Northwind</span> —
                          pricing pushback, renewal Q3{" "}
                          <span className="text-gray-900 underline underline-offset-2 decoration-gray-300 cursor-pointer font-mono">
                            customers#8a91
                          </span>
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">·</span>
                        <span>
                          <span className="font-medium">Contoso</span> —
                          requested tiered pricing{" "}
                          <span className="text-gray-900 underline underline-offset-2 decoration-gray-300 cursor-pointer font-mono">
                            customers#22e3
                          </span>
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">·</span>
                        <span>+ 2 more</span>
                      </li>
                    </ul>
                    <div className="pt-1.5 border-t border-gray-200 text-xs text-gray-600">
                      <p>
                        Want me to pull their recent orders and account
                        health score too?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input stub */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Ask anything...</span>
                    <span className="ml-auto text-[10px]">⌘ ⏎</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side explainer */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded mb-3">
                  What just happened
                </div>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Claude saw your <code className="text-xs bg-gray-100 px-1 rounded">customers</code>{" "}
                      collection was available via MCP.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      It queried your synced snapshot with a typed filter —
                      not your prod DB. Denied columns never made it into
                      the response.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Every row is clickable; Sarah can verify exactly what
                      Claude saw. Every query is audited.
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-gray-950 text-white rounded-2xl p-5 border border-gray-900">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-2">
                  Without Prismian
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  "Let me export a CSV from the admin panel, paste the first
                  50 rows into Claude, paste the meeting notes separately,
                  and hope it doesn't hallucinate."
                </p>
                <p className="text-xs text-gray-500 mt-3 italic">
                  — Every growth-stage team, twice a week
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Product / How it works ─── */}
      <section id="product" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
              Three steps. Five minutes. Then every AI on your team has safe
              access to the same data.
            </p>
          </div>

          <div className="space-y-20">
            {/* Step 1 */}
            <div className="grid sm:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded mb-4">
                  Step 1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Connect your database
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Paste a read-only Postgres connection string. Prismian
                  introspects the schema, you pick which tables to expose, and
                  pick which columns each table should share. Everything else
                  stays invisible. Initial sync runs in seconds.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Postgres",
                    "Supabase",
                    "Neon",
                    "RDS",
                    "Sheets (soon)",
                    "Notion (soon)",
                  ].map((src) => (
                    <span
                      key={src}
                      className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-950 rounded-2xl p-5">
                <div className="text-xs text-gray-500 mb-2">Connection</div>
                <div className="bg-gray-900 rounded-lg px-3 py-2 mb-4 font-mono text-xs text-gray-300 truncate">
                  postgres://readonly:••••@db.supabase.co:5432/prod
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  Tables (5 of 42 selected)
                </div>
                <div className="space-y-1.5">
                  {[
                    { name: "public.customers", cols: "8 of 12 columns" },
                    { name: "public.orders", cols: "6 of 9 columns" },
                    { name: "public.products", cols: "all columns" },
                  ].map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 border border-gray-800"
                    >
                      <code className="text-xs text-gray-300 font-mono">
                        {t.name}
                      </code>
                      <span className="text-[10px] text-gray-500">
                        {t.cols}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid sm:grid-cols-2 gap-10 items-center">
              <div className="order-2 sm:order-1 bg-gray-950 rounded-2xl p-5">
                <pre className="text-sm text-gray-300 overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "prismian": {
      "command": "npx",
      "args": ["-y", "prismian-mcp"],
      "env": {`}
                  <span className="text-emerald-400">{`
        "PRISMIAN_API_KEY": "pr_sk_a1b2..."`}</span>{`,`}
                  <span className="text-gray-400">{`
        "PRISMIAN_WORKSPACE": "ws_x9y8..."`}</span>
{`
      }
    }
  }
}`}
                </pre>
              </div>
              <div className="order-1 sm:order-2">
                <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded mb-4">
                  Step 2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Give each AI tool a scoped key
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Generate a per-agent key. Pick which tables it can read and
                  which columns to hide from it. Paste the MCP config into
                  Claude Desktop, Cursor, or any MCP-compatible tool. Your sales
                  agent, your CI bot, and your intern's Claude each get
                  different slices of the same connection.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Claude", "Cursor", "ChatGPT", "Custom agents"].map(
                    (tool) => (
                      <span
                        key={tool}
                        className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium"
                      >
                        {tool}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid sm:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded mb-4">
                  Step 3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Every AI tool reads the same data
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Your Cursor queries customers. Your Claude checks orders.
                  ChatGPT searches products. All from the same live, synced,
                  permissioned view. When a row changes in your source DB, the
                  next sync (every 15 minutes, or manual) pushes it out to
                  every agent.
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    A
                  </span>
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Sarah's Cursor</span> asks
                      "which customers churned this quarter?"
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      2:00 PM — queries <code>customers</code> via Prismian
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    A
                  </span>
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Mike's Claude</span> reads
                      the same rows and cross-references <code>orders</code>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      3:15 PM — same connection, zero setup for Mike
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    J
                  </span>
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Jamie</span> opens the audit
                      log — sees every query, by which agent, on which row
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      4:00 PM — full trail, no surprises
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Multi-source ─── */}
      <section className="py-20 sm:py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              One connection, every source
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Same permissions, redaction, and audit on every connector—one
              surface for your agents.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              {
                name: "Postgres",
                sub: "Neon, Supabase, RDS",
                status: "beta",
                iconKey: "postgres",
                iconBg: "bg-[#336791]/10 text-[#336791]",
              },
              {
                name: "Google Sheets",
                sub: "Sheets",
                status: "in progress",
                iconKey: "sheets",
                iconBg: "bg-[#0F9D58]/10 text-[#0F9D58]",
              },
              {
                name: "Notion",
                sub: "DBs + docs",
                status: "in progress",
                iconKey: "notion",
                iconBg: "bg-gray-100 text-gray-900",
              },
              {
                name: "Linear",
                sub: "Issues",
                status: "in progress",
                iconKey: "linear",
                iconBg: "bg-[#5E6AD2]/10 text-[#5E6AD2]",
              },
              {
                name: "Airtable",
                sub: "Bases",
                status: "in progress",
                iconKey: "airtable",
                iconBg: "bg-[#FCB400]/10 text-[#F59B00]",
              },
              {
                name: "MySQL / MariaDB",
                sub: "MySQL + Maria",
                status: "in progress",
                iconKey: "mysql",
                iconBg: "bg-[#00758F]/10 text-[#00758F]",
              },
              {
                name: "BigQuery",
                sub: "Warehouse",
                status: "in progress",
                iconKey: "bigquery",
                iconBg: "bg-[#4285F4]/10 text-[#4285F4]",
              },
              {
                name: "MCP servers",
                sub: "Any server",
                status: "in progress",
                iconKey: "mcp",
                iconBg: "bg-gray-100 text-gray-700",
              },
            ].map((src) => (
              <div
                key={src.name}
                className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${src.iconBg}`}
                >
                  <span className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full">
                    {BRAND_ICONS[src.iconKey]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {src.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border ${
                        src.status === "beta"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {src.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{src.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                One sync, many keys
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                One connection per source. Each agent gets its own scoped key.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Same policy everywhere
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Redaction, audit, rate limits—same rules on every connector.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Cross-source queries
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                <em>"Which enterprise accounts mentioned pricing in Slack?"</em>{" "}
                One question. Multiple sources. One answer.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400 max-w-2xl mx-auto">
            Vendor ships an MCP? Wrap it with your identity, scope, and
            audit—no custom connector wait.
          </p>
        </div>
      </section>

      {/* ─── Inside Prismian: the synced view ─── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">
              Same table. Different agent views.
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Column redaction enforced before anything leaves the API.
            </p>
          </div>

          {/* Table mock */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Banner */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div className="min-w-0 flex items-center gap-2 text-sm">
                <span className="text-[10px] font-mono uppercase tracking-wider bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200 shrink-0">
                  read-only
                </span>
                <span className="text-gray-700 truncate">
                  Synced from{" "}
                  <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                    public.customers
                  </code>
                  <span className="hidden sm:inline text-gray-500">
                    {" "}
                    · last synced 2m ago · 4,823 rows
                  </span>
                </span>
              </div>
              <button className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-md shrink-0 cursor-default hover:bg-gray-800">
                Sync now
              </button>
            </div>

            {/* View selector */}
            <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs">
              <span className="text-gray-500 mr-1">Showing as:</span>
              <span className="bg-white text-gray-800 border border-gray-300 px-2.5 py-1 rounded-md font-medium">
                Sales agent
              </span>
              <span className="text-gray-400 px-2.5 py-1">CS agent</span>
              <span className="text-gray-400 px-2.5 py-1">Internal dashboard</span>
              <span className="ml-auto text-gray-400 hidden sm:inline">
                2 columns redacted for this key
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                      id
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                      email
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                      plan
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                      status
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-400 text-xs uppercase tracking-wide bg-gray-100/80">
                      <span className="inline-flex items-center gap-1">
                        mrr
                        <span className="text-[9px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded">
                          redacted
                        </span>
                      </span>
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-400 text-xs uppercase tracking-wide bg-gray-100/80">
                      <span className="inline-flex items-center gap-1">
                        credit_card_last4
                        <span className="text-[9px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded">
                          redacted
                        </span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      id: "cust_8a91",
                      email: "ana@northwind.io",
                      plan: "enterprise",
                      status: "active",
                    },
                    {
                      id: "cust_bf04",
                      email: "jordan@acme.co",
                      plan: "team",
                      status: "active",
                    },
                    {
                      id: "cust_22e3",
                      email: "sam@contoso.com",
                      plan: "enterprise",
                      status: "at_risk",
                    },
                    {
                      id: "cust_9c7d",
                      email: "priya@initech.io",
                      plan: "team",
                      status: "churned",
                    },
                    {
                      id: "cust_510a",
                      email: "leo@globex.com",
                      plan: "solo",
                      status: "active",
                    },
                  ].map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-4 py-2.5 text-gray-900 font-mono text-xs">
                        {row.id}
                      </td>
                      <td className="px-4 py-2.5 text-gray-800">{row.email}</td>
                      <td className="px-4 py-2.5 text-gray-800">{row.plan}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            row.status === "active"
                              ? "bg-green-100 text-green-700"
                              : row.status === "at_risk"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 bg-gray-100/50">
                        <span className="inline-block bg-gray-200 text-transparent select-none rounded text-xs px-2 font-mono">
                          ██████
                        </span>
                      </td>
                      <td className="px-4 py-2.5 bg-gray-100/50">
                        <span className="inline-block bg-gray-200 text-transparent select-none rounded text-xs px-2 font-mono">
                          ████
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explanation cards */}
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Mirrored, not proxied
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                We snapshot your selected columns into our DB on each sync.
                Agent queries hit our snapshot, not your prod — zero query
                load.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Redaction per agent
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Sales key sees <code className="bg-gray-100 px-1 rounded">email</code>,
                not <code className="bg-gray-100 px-1 rounded">mrr</code>. CS
                key sees <code className="bg-gray-100 px-1 rounded">mrr</code>,
                not <code className="bg-gray-100 px-1 rounded">credit_card_last4</code>.
                Same collection, different views.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Agents never mutate
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Writes to synced collections return <code className="bg-gray-100 px-1 rounded">409 read_only_source</code>.
                Structural, not policy — a permissions bug can't route
                around it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security ─── */}
      <section id="security" className="py-20 sm:py-28 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">
              Built for teams giving AI access to real data
            </h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">
              Because "give Claude your prod password" is not a security model.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                title: "Read-only by construction",
                desc: "Agents cannot write to your source database. Ever. Connected collections reject all writes at the API layer — not just via permissions, but as a structural invariant.",
                tag: "structural",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                ),
              },
              {
                title: "Per-agent column redaction",
                desc: "Your sales agent sees customers.email but not customers.credit_card_last4. Your CI bot sees orders.status but not orders.total_revenue. Configured per key, enforced before data leaves the API.",
                tag: "per-key",
                icon: (
                  <>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88"
                    />
                  </>
                ),
              },
              {
                title: "Encrypted credentials",
                desc: "Your DB connection string is AES-GCM encrypted at rest. Agents never see it. Team members never see it. Rotate or revoke any time without re-connecting tools.",
                tag: "AES-256-GCM",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                  />
                ),
              },
              {
                title: "Full audit trail",
                desc: "Every read, every query, every agent — logged with row IDs and timestamps. Reviewable in the UI or via API. Compliance-ready from day one.",
                tag: "every read",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                  />
                ),
              },
              {
                title: "Rate limiting per agent",
                desc: "Cap queries per hour per key. Prevent a runaway agent from ETLing your whole customers table into a chat window.",
                tag: "per-key cap",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ),
              },
              {
                title: "Scoped, revocable keys",
                desc: "Each AI tool gets its own key with its own scope. Revoke instantly when a contractor offboards or a laptop walks off — without rotating your actual DB password.",
                tag: "instant revoke",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 5.25a3 3 0 013 3m-7.5 11.25l-2.25-2.25m0 0l3.55-3.55a6 6 0 116.193-7.029M11.25 19.5L9 21.75M11.25 19.5l3-3m-3 3v-2.25"
                  />
                ),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-md p-5 border border-gray-200 flex gap-4"
              >
                <div className="shrink-0">
                  <div className="w-9 h-9 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                    <svg
                      className="w-4.5 h-4.5"
                      style={{ width: 18, height: 18 }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                      viewBox="0 0 24 24"
                    >
                      {item.icon}
                    </svg>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Data flow & honesty ─── */}
      <section id="data-flow" className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Honesty up front
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
              Where your data lives
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto leading-relaxed">
              We don't proxy queries to your prod database. We mirror the
              columns you select into our Postgres so agents can be
              permissioned, redacted, and audited before data leaves the
              API. Here's the full story.
            </p>
          </div>

          <div className="bg-gray-950 rounded-xl ring-1 ring-gray-200 shadow-lg shadow-gray-900/5 overflow-hidden mb-8">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-gray-900/60">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                data flow
              </span>
            </div>
            <pre className="text-[12px] sm:text-[13px] leading-relaxed text-gray-300 font-mono p-5 overflow-x-auto">
{`  YOUR SOURCE DB                      PRISMIAN                       AI TOOLS
  ──────────────                      ────────                       ────────

  ┌─────────────┐                    ┌──────────────┐               ┌────────┐
  │  Postgres   │  read-only,        │  Postgres    │  scoped,      │ Cursor │
  │  (Supabase, │  selected cols     │  (mirror of  │  redacted,    │ Claude │
  │   Neon,     │  ─────────────►    │  your cols)  │  audited      │ ChatGPT│
  │   RDS, …)   │  every 15 min      │              │  ─────────►   │ etc.   │
  └─────────────┘                    └──────────────┘               └────────┘
                                            ▲
                                            │
                                  ┌─────────┴─────────┐
                                  │  audit_log table  │  (every read,
                                  │                   │   every actor,
                                  │                   │   every row id)
                                  └───────────────────┘

  Agents NEVER hit your source DB.
  Writes from agents go ONLY into native (non-source) collections.`}
            </pre>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-8">
            {[
              {
                label: "Encryption",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                ),
                items: [
                  { ok: true, text: "Connection strings: AES-256-GCM at rest" },
                  { ok: true, text: "All transport: TLS 1.2+" },
                  {
                    ok: false,
                    text: "Row data: Supabase disk encryption only — app-level layer on roadmap",
                  },
                ],
              },
              {
                label: "Access",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                ),
                items: [
                  { ok: true, text: "Workspace isolation: middleware + Postgres RLS" },
                  { ok: true, text: "Per-agent column redaction before data leaves the API" },
                  {
                    ok: false,
                    text: "Workspace = trust boundary; member-level scoping not enforced. Internal teams, not customer portals.",
                  },
                  {
                    ok: false,
                    text: "Founder retains DB-admin access. Not SOC 2 yet.",
                  },
                ],
              },
              {
                label: "Retention",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                ),
                items: [
                  { ok: true, text: "Delete workspace → every entry, key, audit row cascades" },
                  { ok: true, text: "Delete a collection → its synced rows go with it" },
                  { ok: true, text: "Disconnect a source → cascades to every reader collection" },
                ],
              },
            ].map((col) => (
              <div
                key={col.label}
                className="bg-white rounded-md border border-gray-200 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                    <svg
                      style={{ width: 14, height: 14 }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                      viewBox="0 0 24 24"
                    >
                      {col.icon}
                    </svg>
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    {col.label}
                  </p>
                </div>
                <ul className="text-xs text-gray-700 space-y-2 leading-relaxed">
                  {col.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {it.ok ? (
                        <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                          <svg
                            className="w-2 h-2 text-emerald-700"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                          <span className="w-1 h-1 rounded-full bg-amber-500" />
                        </span>
                      )}
                      <span className={it.ok ? "" : "text-gray-600"}>
                        {it.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 flex items-start gap-3">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-emerald-700"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-medium text-gray-900">
                Start with non-production data.
              </span>{" "}
              A staging DB, read replica, or workspace clone. Not because
              we'd misuse prod — because nobody trusts a beta with real
              customers on day one. By the time you graduate to prod, we'll
              have shipped app-level encryption and SOC 2 paper.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Agent capabilities (compact) ─── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
            What your agents actually get
          </h2>
          <p className="mt-3 text-gray-500 leading-relaxed">
            Six read tools and two write tools wired automatically.
            Schema-aware, scope-enforced, audited. Works with any
            MCP-compatible AI tool — no SDK to integrate.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              "list_collections",
              "query_structured",
              "aggregate",
              "search",
              "read_entry",
              "workspace_info",
              "write_entry",
              "update_entry",
            ].map((t) => (
              <code
                key={t}
                className="text-[11px] font-mono bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded"
              >
                {t}
              </code>
            ))}
          </div>
          <Link
            to="/docs/tools"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline underline-offset-4 decoration-emerald-500 decoration-2"
          >
            Read the full tool reference →
          </Link>
        </div>
      </section>

      {/* ─── Comparison ─── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Why not just...
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Give agents a read-only Postgres password?",
                a: "That's 4 config files in 4 developers' machines, each with your DB password in plaintext. No per-agent scopes, no column-level redaction, no audit of which agent read what. And you rotate that password every time someone leaves.",
              },
              {
                q: "Just use a Postgres MCP server?",
                a: "You could — and they exist. But they're single-user, no-auth, no-redaction, no-audit. Prismian is what you get when you wrap one in identity, scoped keys, field-level ACLs, and a team UI. Also: native collections for agent-generated knowledge. Plain MCP servers can't do that.",
              },
              {
                q: "Notion / Confluence?",
                a: "They store knowledge for humans. Your AI agents can't natively query your Postgres through them. And you're still hand-pasting data between the two.",
              },
              {
                q: "Build our own with Postgres + pgvector?",
                a: "You could — and many teams do, for about two weeks, until they hit agent keys, field-level ACLs, audit trail, sync state, optimistic locking, and encryption-at-rest. Prismian is what you'd build. We built it so you don't have to.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="bg-white rounded-xl p-6 border border-gray-200"
              >
                <h3 className="font-semibold text-gray-900">{item.q}</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 sm:py-28 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple pricing
          </h2>
          <p className="text-gray-500 mb-12">
            Free while we're in beta. We'll add paid tiers when you need them.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-900 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg">Free</h3>
              <p className="mt-1 text-sm text-gray-500">
                For small teams getting started
              </p>
              <p className="mt-4 text-4xl font-bold text-gray-900">$0</p>
              <ul className="mt-6 text-sm text-gray-600 space-y-3 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  Up to 5 team members
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  1 Postgres connection · unlimited tables
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  Full audit trail + scoped writable collections for agent
                  output
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  5 scoped agent keys
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  15-minute sync · MCP (stdio + SSE)
                </li>
              </ul>
              <Link
                to="/register"
                className="mt-8 block w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg">Team</h3>
              <p className="mt-1 text-sm text-gray-500">For growing teams</p>
              <p className="mt-4 text-4xl font-bold text-gray-400">Soon</p>
              <ul className="mt-6 text-sm text-gray-600 space-y-3 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  Unlimited members &amp; agent keys
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  Multiple data sources · Sheets, Notion, Linear
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  1-minute sync · priority embedding queue
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  Advanced audit &amp; anomaly alerts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  SSO / SAML
                </li>
              </ul>
              <button
                disabled
                className="mt-8 block w-full bg-gray-100 text-gray-400 py-3 rounded-xl text-sm font-medium cursor-not-allowed"
              >
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-24 bg-gray-950 text-white overflow-hidden border-t border-gray-900">
        {/* Subtle dotted background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 pointer-events-none"
        >
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,10,10,0)_0%,rgba(10,10,10,0.8)_70%,rgba(10,10,10,1)_100%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
          {/* Stats band */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pb-14 mb-12 border-b border-gray-800/80">
            {[
              { label: "MCP tools included", value: "8" },
              { label: "Default sync interval", value: "15 min" },
              { label: "Agent writes to source DB", value: "0" },
              { label: "Time to first query", value: "~5 min" },
            ].map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                  {stat.value}
                </p>
                <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-wider font-mono">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-semibold leading-[1.1] tracking-tight">
              Stop pasting rows into chat.
              <br />
              <span className="text-white underline decoration-emerald-500 decoration-[3px] underline-offset-[6px]">
                Connect your database instead.
              </span>
            </h2>
            <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto">
              The AI-safe access layer for your team's data. Permissioned,
              audited, column-redacted, live-synced. Every AI tool on your
              team reading the same source of truth — each with its own
              scope.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="w-full sm:w-auto bg-white text-gray-900 px-6 py-3 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Connect your database
              </Link>
              <a
                href="#product"
                className="w-full sm:w-auto text-gray-300 px-6 py-3 rounded-md text-sm font-medium hover:text-white border border-gray-800 hover:border-gray-600 transition-colors"
              >
                See how it works
              </a>
            </div>
            <p className="mt-6 text-xs text-gray-500 font-mono">
              no credit card · connects in 10 minutes · works with any MCP-compatible AI
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-950 border-t border-gray-800 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-lg font-bold text-white">Prismian</span>
              <p className="text-xs text-gray-500 mt-1">
                AI-safe access layer for your team's data.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
              <a href="#product" className="hover:text-gray-300 transition-colors">Product</a>
              <Link to="/docs" className="hover:text-gray-300 transition-colors">Docs</Link>
              <Link to="/security" className="hover:text-gray-300 transition-colors">Security</Link>
              <a href="#pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
              <Link to="/login" className="hover:text-gray-300 transition-colors">Sign in</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 text-xs text-gray-600 text-center">
            &copy; {new Date().getFullYear()} Prismian. Built with Postgres,
            pgvector, and the MCP protocol.
          </div>
        </div>
      </footer>
    </div>
  );
}
