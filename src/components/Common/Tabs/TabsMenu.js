import { Menu } from "../Menu/Menu";

export const TabsMenu = ({
  onClick,
  editable = true,
  closable = true,
  virtual = false,
}) => {
  return (
    <Menu size="medium" onClick={(e) => e.domEvent.stopPropagation()}>
      {editable && !virtual && (
        <Menu.Item onClick={() => onClick("edit")}>
          重命名
        </Menu.Item>
      )}

      {!virtual && (
        <Menu.Item onClick={() => onClick("duplicate")}>
        复制
        </Menu.Item>
      )}

      {virtual && (
        <Menu.Item onClick={() => onClick("save")}>
            保存
        </Menu.Item>
      )}

      {closable ? (
        <>
          {!virtual && <Menu.Divider />}
          <Menu.Item onClick={() => onClick("close")}>
            关闭
          </Menu.Item>
        </>
      ) : null}
    </Menu>
  );
};
