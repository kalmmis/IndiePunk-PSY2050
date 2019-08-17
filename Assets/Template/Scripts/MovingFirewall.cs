using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MovingFirewall : MonoBehaviour
{
    public float speed;
    public float speedMinRange;
    public float speedMaxRange;

    public float widthMinRange;
    public float widthMaxRange;

    public void Start()
    {
        float newXScale = Random.Range(widthMinRange, widthMaxRange);
        transform.localScale = new Vector3(newXScale, transform.localScale.y, transform.localScale.z);
        speed = Random.Range(speedMinRange, speedMaxRange);
    }
    //moving the object with the defined speed
    private void Update()
    {
        transform.Translate(Vector3.left * speed * 4f * Time.deltaTime);
    }
}
