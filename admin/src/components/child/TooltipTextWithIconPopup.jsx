import { useEffect } from "react";
// Defer load of Bootstrap Tooltip until component mounts
import { Icon } from "@iconify/react/dist/iconify.js";

const TooltipTextWithIconPopup = () => {
  useEffect(() => {
    let instances = [];
    let cancelled = false;
    (async () => {
      const mod = await import('bootstrap/js/dist/tooltip');
      const Tooltip = mod.default;
      if (cancelled) return;
      const tooltipButtons = document.querySelectorAll('.tooltip-buttonThree');
      instances = Array.from(tooltipButtons).map((btn) => {
        const tooltipContent = btn.nextElementSibling?.innerHTML || '';
        return new Tooltip(btn, {
          title: tooltipContent,
          trigger: 'hover',
          html: true,
          customClass: btn.getAttribute('data-bs-custom-class') || '',
        });
      });
    })();
    return () => {
      cancelled = true;
      instances.forEach((t) => t?.dispose?.());
    };
  }, []);
  return (
    <div className='col-lg-6'>
      <div className='card h-100 p-0'>
        <div className='card-header border-bottom bg-base py-16 px-24'>
          <h6 className='text-lg fw-semibold mb-0'>
            Tooltip Text with icon popup{" "}
          </h6>
        </div>
        <div className='card-body p-24'>
          <div className='d-flex flex-wrap align-items-center gap-3'>
            <ul className='list-decimal ps-20'>
              <li className='text-secondary-light mb-8'>
                This is tooltip text popup {"  "}
                <button
                  type='button'
                  className='tooltip-buttonThree inline-grid text-primary-600'
                  data-bs-toggle='tooltip'
                  data-bs-custom-class='tooltip-primary'
                  data-bs-placement='right'
                >
                  <Icon
                    icon='jam:alert'
                    className='text-primary-light text-lg mt-4'
                  />{" "}
                </button>
                <div className='my-tooltip tip-content hidden text-start shadow'>
                  <h6 className='text-white'>This is title</h6>
                  <p className='text-white'>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry.
                  </p>
                </div>
              </li>
              <li className='text-secondary-light mb-8'>
                This is tooltip text popup {"  "}
                <button
                  type='button'
                  className='tooltip-buttonThree inline-grid text-primary-600'
                  data-bs-toggle='tooltip'
                  data-bs-custom-class='tooltip-primary'
                  data-bs-placement='right'
                >
                  <Icon
                    icon='jam:alert'
                    className='text-primary-light text-lg mt-4'
                  />{" "}
                </button>
                <div className='my-tooltip tip-content hidden text-start shadow'>
                  <h6 className='text-white'>This is title</h6>
                  <p className='text-white'>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry.
                  </p>
                </div>
              </li>
              <li className='text-secondary-light mb-8'>
                This is tooltip text popup {"  "}
                <button
                  type='button'
                  className='tooltip-buttonThree inline-grid text-primary-600'
                  data-bs-toggle='tooltip'
                  data-bs-custom-class='tooltip-primary'
                  data-bs-placement='right'
                >
                  <Icon
                    icon='jam:alert'
                    className='text-primary-light text-lg mt-4'
                  />{" "}
                </button>
                <div className='my-tooltip tip-content hidden text-start shadow'>
                  <h6 className='text-white'>This is title</h6>
                  <p className='text-white'>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry.
                  </p>
                </div>
              </li>
              <li className='text-secondary-light mb-8'>
                This is tooltip text popup {"  "}
                <button
                  type='button'
                  className='tooltip-buttonThree inline-grid text-primary-600'
                  data-bs-toggle='tooltip'
                  data-bs-custom-class='tooltip-primary'
                  data-bs-placement='right'
                >
                  <Icon
                    icon='jam:alert'
                    className='text-primary-light text-lg mt-4'
                  />{" "}
                </button>
                <div className='my-tooltip tip-content hidden text-start shadow'>
                  <h6 className='text-white'>This is title</h6>
                  <p className='text-white'>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry.
                  </p>
                </div>
              </li>
              <li className='text-secondary-light'>
                This is tooltip text popup {"  "}
                <button
                  type='button'
                  className='tooltip-buttonThree inline-grid text-primary-600'
                  data-bs-toggle='tooltip'
                  data-bs-custom-class='tooltip-primary'
                  data-bs-placement='right'
                >
                  <Icon
                    icon='jam:alert'
                    className='text-primary-light text-lg mt-4'
                  />{" "}
                </button>
                <div className='my-tooltip tip-content hidden text-start shadow'>
                  <h6 className='text-white'>This is title</h6>
                  <p className='text-white'>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TooltipTextWithIconPopup;
