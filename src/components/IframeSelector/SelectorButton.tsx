import React from 'react';
import Button from 'modules/Common/components/Button';
import { FiTrash2 as RemoveIcon, FiRepeat as SwitchIcon } from 'react-icons/fi';

type SelectorButtonProps = {
  onChange: any;
  onRemove?: any;
  value: string;
} & React.HTMLAttributes<HTMLDivElement>;

interface RangeSelector {
  startBefore?: string;
  endBefore?: string;
  startAfter?: string;
  endAfter?: string;
}

type InputValue = string | RangeSelector;

const SelectorButton: React.FC<SelectorButtonProps> = ({
  onChange,
  onRemove,
  value,
  className,
  ...props
}) => {
  let selectorValue: InputValue;

  try {
    selectorValue = JSON.parse(value) as RangeSelector;
  } catch (e) {
    selectorValue = value as string;
  }

  const [selector, setSelector] = React.useState<InputValue>(selectorValue);
  const isRangeObject = typeof selector === 'object';

  const updateSelector = React.useCallback(
    (newSelector: InputValue) => {
      setSelector(newSelector);
      onChange(typeof newSelector === 'object' ? JSON.stringify(newSelector) : newSelector);
    },
    [isRangeObject]
  );

  const onSwitch = () => {
    if (isRangeObject) {
      const newSelector: string = (selector as any)[
        Object.keys(selector as any).filter(Boolean)[0] || 'startBefore'
      ];
      updateSelector(newSelector);
    } else {
      updateSelector({ startBefore: selector });
    }
  };

  const onObjectChange = React.useCallback(
    (key: keyof RangeSelector) => (e: any) => {
      const newSelector = e.target.value;
      const newObject = { ...(selector as RangeSelector) };

      if (newSelector) {
        newObject[key] = newSelector;
      } else {
        delete newObject[key];
      }
      updateSelector(newObject);
    },
    [selector, updateSelector]
  );

  return (
    <div key={value} className={className} {...props}>
      {!isRangeObject && <input defaultValue={selector} onInput={onChange} />}
      {isRangeObject && (
        <table>
          <tr>
            <td>startBefore</td>
            <td>
              <input
                defaultValue={selector?.startBefore}
                onInput={onObjectChange('startBefore')}
                disabled={!!selector?.startAfter}
              />
            </td>
          </tr>
          <tr>
            <td>startAfter</td>
            <td>
              <input
                defaultValue={selector?.startAfter}
                onInput={onObjectChange('startAfter')}
                disabled={!!selector?.startBefore}
              />
            </td>
          </tr>
          <tr>
            <td>endBefore</td>
            <td>
              <input
                defaultValue={selector?.endBefore}
                onInput={onObjectChange('endBefore')}
                disabled={!!selector?.endAfter}
              />
            </td>
          </tr>
          <tr>
            <td>endAfter</td>
            <td>
              <input
                defaultValue={selector?.endAfter}
                onInput={onObjectChange('endAfter')}
                disabled={!!selector?.endBefore}
              />
            </td>
          </tr>
        </table>
      )}

      <Button onClick={onSwitch} size="sm" onlyIcon={true}>
        <SwitchIcon />
      </Button>
      <Button onClick={onRemove} type="secondary" color="red" size="sm" onlyIcon={true}>
        <RemoveIcon />
      </Button>
    </div>
  );
};

export default SelectorButton;