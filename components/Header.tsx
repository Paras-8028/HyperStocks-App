import Link from "next/link";
import Image from "next/image"
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";
import {searchStocks} from "@/lib/actions/finnhub.actions";
import { SmartAlertCenter } from "@/features/alerts";

const Header = async ({ user }: { user: User }) => {
    const initialStocks = await searchStocks();

    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <Link href="/">
                    <Image src="/assets/icons/L1.png" alt="HyperStocks logo" width={140} height={32} className="h-10 w-auto cursor-pointer"/>
                </Link>

                <nav className="hidden sm:block">
                    <NavItems initialStocks={initialStocks} />
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                    <SmartAlertCenter />
                    <UserDropdown user={user} initialStocks={initialStocks} />
                </div>
            </div>
        </header>
    )
}
export default Header

