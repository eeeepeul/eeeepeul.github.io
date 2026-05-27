import Link from 'next/link'
import { slug } from 'github-slugger'
interface Props {
  text: string
}

const Tag = ({ text }: Props) => {
  return (
    <Link
      href={`/tags/${slug(text)}`}
      className="dark:text-primary-300 dark:hover:text-primary-200 mr-3 text-sm font-medium text-[#6f7f9f] uppercase transition duration-300 hover:text-[#27334f]"
    >
      {text.split(' ').join('-')}
    </Link>
  )
}

export default Tag
