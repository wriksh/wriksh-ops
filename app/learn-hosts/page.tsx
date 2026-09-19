import { permanentRedirect } from "next/navigation";

export default function LearnHostsRedirect() {
  permanentRedirect("/people?role=host");
}
