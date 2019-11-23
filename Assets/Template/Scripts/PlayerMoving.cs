using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
/// <summary>
/// This script defines the borders of ‘Player’s’ movement. Depending on the chosen handling type, it moves the ‘Player’ together with the pointer.
/// </summary>

[System.Serializable]
public class Borders
{
    [Tooltip("offset from viewport borders for player's movement")]
    public float minXOffset = 1.5f, maxXOffset = 1.5f, minYOffset = 1.5f, maxYOffset = 1.5f;
    [HideInInspector] public float minX, maxX, minY, maxY;
}

public class PlayerMoving : MonoBehaviour {

    [Tooltip("offset from viewport borders for player's movement")]
    public Borders borders;
    Camera mainCamera;
    bool controlIsActive = true; 

    public static PlayerMoving instance; //unique instance of the script for easy access to the script
    Player playerScript;
    PlayerShooting playerShootingScript;

    public Animator animator;

    private void Awake()
    {
        if (instance == null)
            instance = this;
    }

    private void Start()
    {
        mainCamera = Camera.main;
        playerScript = gameObject.GetComponent<Player>();
        playerShootingScript = gameObject.GetComponent<PlayerShooting>();

        ResizeBorders();                //setting 'Player's' moving borders deending on Viewport's size
    }

    private void Update()
    {
        if (controlIsActive)
        {
#if UNITY_WEBGL || UNITY_EDITOR    //if the current platform is not mobile, setting mouse handling 

            if (Input.GetMouseButton(0) && !EventSystem.current.IsPointerOverGameObject()) //if mouse button was pressed       
            {
                Vector3 mousePosition = mainCamera.ScreenToWorldPoint(Input.mousePosition); //calculating mouse position in the worldspace
                mousePosition.z = transform.position.z;
                //if(playerScript.isAttackMode) mousePosition.y = transform.position.y;
                mousePosition.Set(mousePosition.x, mousePosition.y, mousePosition.z);
                transform.position = mousePosition;//Vector3.MoveTowards(transform.position, mousePosition, 30 * Time.deltaTime);
                playerScript.isAttackMode = true;
                if(playerShootingScript.startAttackTimestamp == 0) playerShootingScript.startAttackTimestamp = Time.frameCount;
                animator.SetTrigger("TrigPlayerAttack");
            }
            if (Input.GetMouseButtonUp(0))
            {
                playerScript.isAttackMode = false;
                playerShootingScript.startAttackTimestamp = 0;
                playerShootingScript.ResetWeaponPower();
                animator.SetTrigger("TrigPlayerIdle");
                StartCoroutine(playerShootingScript.TimeReset());
            }
            else
            {
            }
           /* else if (Input.GetKey(KeyCode.A))
            {
                Vector3 newPosition = new Vector3();
                newPosition.Set(transform.position.x - 0.3f, transform.position.y, transform.position.z);
                transform.position = Vector3.MoveTowards(transform.position, newPosition, 30 * Time.deltaTime);
            }
            else if(Input.GetKey(KeyCode.D))
            {
                Vector3 newPosition = new Vector3();
                newPosition.Set(transform.position.x + 0.3f, transform.position.y, transform.position.z);
                transform.position = Vector3.MoveTowards(transform.position, newPosition, 30 * Time.deltaTime);
            }*/
#endif

#if UNITY_IOS || UNITY_ANDROID //if current platform is mobile, 

            if (Input.touchCount == 1) // if there is a touch
            {
                Touch touch = Input.touches[0];
                Vector3 touchPosition = mainCamera.ScreenToWorldPoint(touch.position);  //calculating touch position in the world space
                touchPosition.z = transform.position.z;
                transform.position = Vector3.MoveTowards(transform.position, touchPosition, 30 * Time.deltaTime);
            }
#endif
            transform.position = new Vector3    //if 'Player' crossed the movement borders, returning him back 
                (
                Mathf.Clamp(transform.position.x, borders.minX, borders.maxX),
                Mathf.Clamp(transform.position.y, borders.minY, borders.maxY),
                0
                );
        }
    }

    //setting 'Player's' movement borders according to Viewport size and defined offset
    void ResizeBorders() 
    {
        borders.minX = mainCamera.ViewportToWorldPoint(Vector2.zero).x + borders.minXOffset;
        borders.minY = mainCamera.ViewportToWorldPoint(Vector2.zero).y + borders.minYOffset;
        borders.maxX = mainCamera.ViewportToWorldPoint(Vector2.right).x - borders.maxXOffset;
        borders.maxY = mainCamera.ViewportToWorldPoint(Vector2.up).y - borders.maxYOffset;
    }
}
