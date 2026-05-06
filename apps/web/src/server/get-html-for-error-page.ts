import { serializeError } from 'serialize-error';

export const getHTMLForErrorPage = (err: unknown): string => {
  return `
<html>
  <head>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
    function copyError () {
      navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(serializeError(err))}, null, 2))
    }
    </script>
  </head>
  <body>
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out opacity-100" >
    <div class="bg-[#18191B] text-[#F2F2F2] rounded-lg p-4 max-w-md w-full mx-4 shadow-lg" >
      <div class="flex items-start gap-3" >
        <div class="flex-shrink-0" >
          <div class="w-8 h-8 bg-[#F2F2F2] rounded-full flex items-center justify-center" ><span class="text-black text-[1.125rem] leading-none" >⚠</span></div>
        </div>
        <div class="flex flex-col gap-2 flex-1" >
          <div class="flex flex-col gap-1" >
            <p class="font-light text-[#F2F2F2] text-sm" >App Error Detected</p>
            <p class="text-[#959697] text-sm font-light" >It looks like an error occurred while trying to use your app.</p>
          </div>
          <div class="flex gap-2">
            <button id="copy" onclick="copyError()" class="flex flex-row items-center justify-center gap-[4px] outline-none transition-all rounded-[8px] border-[1px] bg-[#2C2D2F] hover:bg-[#414243] active:bg-[#555658] border-[#414243] text-white text-sm px-[8px] py-[4px] cursor-pointer">Copy error</button>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
    `;
};
