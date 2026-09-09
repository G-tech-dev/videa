const Loader = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-dark-600">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
      <p className="mt-4 text-sm font-medium">{text}</p>
    </div>
  );
};

export default Loader;
