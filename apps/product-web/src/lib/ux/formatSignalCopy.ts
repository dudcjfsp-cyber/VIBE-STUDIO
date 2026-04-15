import type { ApprovalLevel, RendererId } from "@vive-studio/engine-contracts";

export function formatApprovalCopy(
  approvalLevel: ApprovalLevel,
  renderer: RendererId,
) {
  if (approvalLevel === "required") {
    return `${formatRendererLabel(renderer)} 결과는 확인 없이 바로 만들면 위험할 수 있어요.`;
  }

  return "한 번 더 확인하면 지금 요청에 더 잘 맞출 수 있어요.";
}

export function formatClarifyLead(renderer: RendererId) {
  return `${formatRendererLabel(renderer)} 결과를 책임 있게 만들기 전에 이것만 더 알려주세요.`;
}

export function formatRendererLabel(renderer: RendererId) {
  switch (renderer) {
    case "plan":
      return "기획 정리";
    case "architecture":
      return "구조 설계";
    case "review-report":
      return "검토";
    case "prompt":
    default:
      return "프롬프트";
  }
}
