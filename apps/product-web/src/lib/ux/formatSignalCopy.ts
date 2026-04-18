import type { ApprovalLevel, RendererId } from "@vive-studio/engine-contracts";

export function formatApprovalCopy(
  approvalLevel: ApprovalLevel,
  renderer: RendererId,
) {
  if (approvalLevel === "required") {
    return `${formatRendererLabel(renderer)} 결과는 확인 없이 바로 만들기보다 한 번 점검하고 진행하는 편이 안전합니다.`;
  }

  return "지금 방향은 괜찮지만, 한 번 확인하면 결과를 더 맞춤형으로 다듬을 수 있습니다.";
}

export function formatClarifyLead(renderer: RendererId) {
  return `${formatRendererLabel(renderer)} 결과를 책임 있게 만들기 전에 이것만 더 알려주세요.`;
}

export function formatRendererLabel(renderer: RendererId) {
  switch (renderer) {
    case "plan":
      return "아이디어 정리";
    case "architecture":
      return "구조 설계";
    case "review-report":
      return "검토";
    case "prompt":
    default:
      return "프롬프트";
  }
}
