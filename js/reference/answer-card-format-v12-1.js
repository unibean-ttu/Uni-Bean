/** Uni-Bean 12.1 Scheme A: safe, no-HTML answer formatting helpers.
 * This module never invents a rule, eligibility requirement, date or citation.
 */
export function cleanAnswerText(raw) {
  let value = String(raw ?? '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
  // Remove presentational Markdown markers without interpreting HTML from the model.
  value = value.replace(/(^|\n)\s{0,3}#{1,6}\s+/g, '$1');
  value = value.replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/__([^_\n]+)__/g, '$1');
  value = value.replace(/`([^`\n]+)`/g, '$1');
  value = value.replace(/(^|\n)(?:\*\s+|[-•]\s+)/g, '$1• ');
  // Remove unpaired bold tokens left behind by an imperfect model response.
  value = value.replace(/\*\*/g, '');
  return value.trim();
}

/** Show a verification notice once when the backend repeats synonyms. */
export function conciseSourceWarning(raw) {
  const value = cleanAnswerText(raw).replace(/^(?:⚠️?\s*|提醒\s*[:：]\s*)+/gu,'').trim();
  if (!value) return '';
  const sentences = value.split(/(?<=。)/u).map(part => part.trim()).filter(Boolean);
  const reviewLike = part => /來源/u.test(part) && /(?:未完成|尚未|待|未經)/u.test(part) && /(?:核實|查證|驗證)/u.test(part);
  if (sentences.filter(reviewLike).length < 2) return value;
  // Keep unrelated caveats (deadlines, exceptions, lack of evidence) unchanged.
  let seenReview = false;
  return sentences.filter(part => {
    if (!reviewLike(part)) return true;
    if (seenReview) return false;
    seenReview = true;
    return true;
  }).join('');
}

const listPrefix = /^(?:\d{1,2}\s*[.、．)]|[（(]\d{1,2}[）)]|[•*-])\s*/;
const titleOnly = /^(?:回答重點|重點整理|建議步驟|摘要|總結|說明)\s*[:：]?$/u;
// Do not treat boilerplate introductions as meaningful summaries.
// We never generate new academic requirements from fragments: if the backend has
// only a generic preamble, the card simply starts with its supported key points.
export function isFillerIntroduction(text) {
  const t = cleanAnswerText(text).replace(/\s+/gu, ' ').trim();
  if (!t) return true;
  if (/^(?:根據|依據|參考).{0,160}(?:來源|文件|資料|公告).{0,160}(?:包括以下|包含以下|以下(?:幾個|重點|內容|事項)|如下|整理如下|列出以下).{0,20}[：:。]?$/u.test(t)) return true;
  if (/(?:修業規定|相關規定|規定|內容|事項)(?:主要)?(?:包括|包含|有)(?:以下|下列)(?:重點|內容|幾點|事項|項目)?[：:。]?$/u.test(t)) return true;
  return /^(?:以下|如下)(?:是|為)?(?:重點|整理|說明|內容|事項)[：:。]?$/u.test(t);
}

// A repeated generic disclaimer does not merit a separate "補充說明" box.
// This deliberately does not strip specific deadlines, eligibility or procedures.
export function isRepeatedGenericNotice(text) {
  const t = cleanAnswerText(text).replace(/\s+/gu, ' ').trim();
  if (!/^(?:請注意|注意|提醒|溫馨提醒|備註)[，,：:\s]?/u.test(t)) return false;
  const suggestsOfficial = /(?:建議|請|仍應|仍需|務必|實際).{0,130}(?:查閱|查看|參考|確認|核對|依|以).{0,80}(?:最新|官方|公告|原文)/u.test(t);
  const sourceMayChange = /(?:隨時間|因時間|可能變動|可能異動|可能更新|最新公告|最新規定|以官方.*為準)/u.test(t);
  const concreteDetails = /(?:\d{3,4}[-/年]\d{1,2}|\d{1,2}月\d{1,2}日|\d{2,3}學年度|\d+學分|第\d+條)/u.test(t);
  return suggestsOfficial && sourceMayChange && !concreteDetails;
}

const canonical = text => cleanAnswerText(text).replace(/^[\s\d.、．)（(）•*-]+/gu, '').replace(/[\s，,。：；;、\[\]【】「」『』]/gu, '').toLowerCase();

function pointText(text) {
  return cleanAnswerText(text).replace(listPrefix, '').replace(/^(?:回答重點|重點整理)\s*[:：]\s*/u, '').trim();
}
function isBullet(line) { return listPrefix.test(line.trim()); }
function uniquePoints(items) {
  const result = [], seen = [];
  for (const value of items) {
    const point = pointText(value);
    const token = canonical(point);
    if (!token || token.length < 3 || titleOnly.test(point)) continue;
    if (seen.some(old => old === token || (Math.min(old.length, token.length) >= 18 && (old.includes(token) || token.includes(old))))) continue;
    seen.push(token);result.push(point);
  }
  return result;
}

/**
 * The existing backend may return the introduction as `summary` and the same
 * numbered paragraphs as both `answer` and `key_points`. Show each point once.
 * Full source answer remains available on deliberate expansion.
 */
export function prepareAnswerCard(result) {
  const answer = cleanAnswerText(result?.answer || '無法取得回答。');
  const originalSummary = cleanAnswerText(result?.summary || '');
  const lines = answer.split('\n').map(line => line.trim()).filter(Boolean);
  const fromAnswer = lines.filter(isBullet);
  const fromStructured = Array.isArray(result?.suggested_steps) && result.suggested_steps.length
    ? result.suggested_steps : (Array.isArray(result?.key_points) ? result.key_points : []);
  const summaryIsPoint = isBullet(originalSummary);
  const points = uniquePoints([...(summaryIsPoint ? [originalSummary] : []), ...fromAnswer, ...fromStructured]);
  const firstIntro = lines.find(line => !isBullet(line) && !titleOnly.test(line) && !isFillerIntroduction(line) && !isRepeatedGenericNotice(line) && !/^(?:請注意|注意|提醒|溫馨提醒|備註)[，,：:\s]/u.test(line));
  let summary = summaryIsPoint || isFillerIntroduction(originalSummary) || isRepeatedGenericNotice(originalSummary) ? '' : originalSummary;
  if (!summary && firstIntro) summary = firstIntro;
  if (titleOnly.test(summary) || isFillerIntroduction(summary) || isRepeatedGenericNotice(summary)) summary = '';
  if (summary && points.some(point => canonical(summary) === canonical(point))) summary = '';
  // Some model answers are only a paragraph; show the whole paragraph once.
  if (!points.length) return {summary:'', points:[], body:answer, fullAnswer:answer};
  const extras = lines.filter(line => !isBullet(line) && !titleOnly.test(line) && !isFillerIntroduction(line) && !isRepeatedGenericNotice(line) && canonical(line)!==canonical(summary));
  return {summary, points, body:extras.join('\n'), fullAnswer:answer};
}
