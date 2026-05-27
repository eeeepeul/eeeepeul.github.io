import Link from './Link'
import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[#c8d0e4]/80 pt-8 dark:border-gray-800">
      <div className="flex flex-col gap-8 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-4 text-xs font-medium text-[#72809d] uppercase dark:text-gray-400">
            Stay in orbit
          </p>
          <div className="flex flex-wrap gap-4">
            <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} size={6} />
            <SocialIcon kind="github" href={siteMetadata.github} size={6} />
            <SocialIcon kind="facebook" href={siteMetadata.facebook} size={6} />
            <SocialIcon kind="youtube" href={siteMetadata.youtube} size={6} />
            <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size={6} />
            <SocialIcon kind="twitter" href={siteMetadata.twitter} size={6} />
            <SocialIcon kind="bluesky" href={siteMetadata.bluesky} size={6} />
            <SocialIcon kind="x" href={siteMetadata.x} size={6} />
            <SocialIcon kind="instagram" href={siteMetadata.instagram} size={6} />
            <SocialIcon kind="threads" href={siteMetadata.threads} size={6} />
            <SocialIcon kind="medium" href={siteMetadata.medium} size={6} />
          </div>
        </div>

        <div className="space-y-2 text-sm leading-6 text-[#65718a] sm:text-right dark:text-gray-400">
          <div className="flex flex-wrap gap-x-2 sm:justify-end">
            <span>{siteMetadata.author}</span>
            <span>{`© ${new Date().getFullYear()}`}</span>
            <Link href="/">{siteMetadata.title}</Link>
          </div>
          <Link
            href="https://github.com/timlrx/tailwind-nextjs-starter-blog"
            className="inline-block transition duration-300 hover:text-[#27334f] dark:hover:text-gray-100"
          >
            Tailwind Nextjs Theme
          </Link>
        </div>
      </div>
    </footer>
  )
}
