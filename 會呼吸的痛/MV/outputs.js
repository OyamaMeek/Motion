// 三版成片的输出文件；歌词字芯和描边的颜色供 verify-export.mjs 从视频中辨认歌词。
export const OUTPUTS = {
  pixel: {video: '會呼吸的痛_MV.mp4', renderReport: '渲染結果.json', exportReport: '導出檢查.json', sheets: '抽幀', core: [246, 239, 223], rim: [53, 46, 42]},
  paper: {video: '會呼吸的痛_MV_紙藝.mp4', renderReport: '渲染結果_紙藝.json', exportReport: '導出檢查_紙藝.json', sheets: '抽幀_紙藝', core: [53, 46, 42], rim: [251, 245, 230]},
  crayon: {video: '會呼吸的痛_MV_蠟筆.mp4', renderReport: '渲染結果_蠟筆.json', exportReport: '導出檢查_蠟筆.json', sheets: '抽幀_蠟筆', core: [53, 46, 42], rim: [246, 239, 223]},
};
