const HeaderBox = ({ type = "title", title, subtext, user }: HeaderBoxProps) => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-24 lg:text-30 font-semibold text-gray-900 tracking-tight leading-tight">
        {title}
        {type === 'greeting' && (
          <span className="text-gray-900">
            , {user}
          </span>
        )}
      </h1>
      <div className="text-14 font-medium text-gray-500 max-w-xl leading-relaxed">{subtext}</div>
    </div>
  )
}

export default HeaderBox