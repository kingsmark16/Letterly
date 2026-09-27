import anniversaryThumbnail from "../../assets/categories/anniversary/anniversary-thumbnail.png";
import birthdayThumbnail from "../../assets/categories/birthday/birthday-thumbnail.png";
import confessionThumbnail from "../../assets/categories/confession/confession-thumbnail.png";
import thankYouThumbnail from "../../assets/categories/thankyou/thankyou-thumbnail.png";

export const categoryThumbnails = {
  anniversary: anniversaryThumbnail,
  birthday: birthdayThumbnail,
  confession: confessionThumbnail,
  "thank-you": thankYouThumbnail,
} as const;

export function getCategoryThumbnail(categoryKey: string) {
  if (categoryKey === "anniversary") return categoryThumbnails.anniversary;
  if (categoryKey === "birthday") return categoryThumbnails.birthday;
  if (categoryKey === "confession") return categoryThumbnails.confession;
  if (categoryKey === "thank-you") return categoryThumbnails["thank-you"];
  return undefined;
}
