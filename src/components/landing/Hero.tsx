import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import type { HeroData } from './data';

interface HeroProps {
  data: HeroData;
}

const Hero = ({ data }: HeroProps) => {
  const { heading, description, ctaButtons, customerStats, heroImage } = data;

  return (
    <section className="bg-secondary px-4 pb-16 pt-6 sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-[75rem] grid-cols-1 items-center gap-8 py-8 sm:gap-12 md:gap-16 md:py-2 lg:grid-cols-2 lg:gap-24 xl:max-w-[81.25rem]">
        {/* LEFT */}
        <div className="text-center lg:text-left">
          <h1 className="mb-8 font-custom text-[2.1rem] font-bold leading-[1.05] tracking-[-0.5px] text-[#333] xl:text-[3rem]">
            {heading}
          </h1>

          <p className="mb-12 font-custom text-base font-normal leading-[1.6] md:text-xl">
            {description}
          </p>

          <div className="flex justify-center gap-4 whitespace-nowrap lg:justify-start">
            {ctaButtons.map((button, index) => {
              const isHashLink = button.link.includes('#');
              const [path, hash] = isHashLink
                ? button.link.split('#')
                : [button.link, undefined];

              return (
                <Button
                  key={index}
                  variant="default"
                  size="lg"
                  weight="bold"
                  asChild
                  className="font-custom px-4 py-2 text-lg sm:px-8 sm:py-4 sm:text-xl"
                >
                  <Link to={path || '/'} hash={hash}>
                    {button.text}
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* STATIC METRIC */}
          <div className="mt-8 flex items-center justify-center lg:mt-16 lg:justify-start">
            <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 sm:h-12 sm:w-12">
              <svg
                className="h-5 w-5 text-primary sm:h-6 sm:w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z"
                />
              </svg>
            </div>

            <div>
              <p className="text-xl font-bold text-primary sm:text-2xl lg:text-3xl">
                {customerStats.count}
              </p>
              <p className="text-xs font-medium text-gray-600 sm:text-sm lg:text-base">
                {customerStats.text}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="mt-8 flex w-full justify-center overflow-hidden lg:mt-0">
          <picture className="w-full max-w-full">
            {heroImage.webp && (
              <source srcSet={heroImage.webp} type="image/webp" />
            )}
            <img
              src={heroImage.png}
              alt={heroImage.alt}
              className="h-auto w-full max-w-full object-contain object-center"
              loading="eager"
            />
          </picture>
        </div>
      </div>
    </section>
  );
};

export default memo(Hero);
