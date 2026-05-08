const HeaderBox = ({ type = "title", title, subtext, user }: HeaderBoxProps) => {
  return (
    <div className="flex flex-col gap-1 mb-8">
      <h1 className="text-24 md:text-28 font-bold text-gray-900 tracking-tight">
        {title}
        {type === 'greeting' && (
          <span className="text-indigo-600">
            &nbsp;{user}
          </span>
        )}
      </h1>
      <p className="text-14 md:text-16 text-gray-500 font-medium">{subtext}</p>
    </div>
  )
}

export default HeaderBox