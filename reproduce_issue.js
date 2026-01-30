
const urls = [
  "https://qllfquoqrxvfgdudnrrr.supabase.co/storage/v1/object/sign/postcards/user123/post456/nft/descriptors.fset?token=abc",
  "https://project.supabase.co/storage/v1/object/sign/postcards/user-id/post-id/nft/descriptors.fset?token=123",
  "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball",
  "https://example.com/postcards/u/p/nft/descriptors.fset"
];

const regex = /postcards\/([^/]+)\/([^/]+)\/nft\/descriptors\.fset/;

urls.forEach(url => {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(regex);
    console.log(`URL: ${url}`);
    console.log(`Pathname: ${urlObj.pathname}`);
    console.log(`Match:`, match ? "YES" : "NO");
    if (match) {
      console.log(`User ID: ${match[1]}`);
      console.log(`Postcard ID: ${match[2]}`);
    }
    console.log("---");
  } catch (e) {
    console.log(`Error parsing URL: ${url}`, e.message);
    console.log("---");
  }
});
